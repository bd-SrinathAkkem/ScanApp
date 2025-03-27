import {debug, info, setFailed, setOutput} from '@actions/core'
import {checkJobResult, cleanupTempDir, createTempDir, isPullRequestEvent, parseToBoolean} from './blackduck-security-action/utility'
import {Bridge} from './blackduck-security-action/bridge-cli'
import {getGitHubWorkspaceDir as getGitHubWorkspaceDirV2} from 'actions-artifact-v2/lib/internal/shared/config'
import * as constants from './application-constants'
import * as inputs from './blackduck-security-action/inputs'
import {uploadDiagnostics, uploadSarifReportAsArtifact} from './blackduck-security-action/artifacts'
import {isNullOrEmptyValue} from './blackduck-security-action/validators'
import {GitHubClientServiceFactory} from './blackduck-security-action/factory/github-client-service-factory'

export async function run() {
  info('Black Duck Security Action started...')
  const tempDir = await createTempDir()
  let formattedCommand = ''
  let isBridgeExecuted = false
  let exitCode

  try {
    const sb = new Bridge()
    // Prepare bridge command
    formattedCommand = await sb.prepareCommand(tempDir)
    // Download bridge
    if (!inputs.ENABLE_NETWORK_AIR_GAP) {
      await sb.downloadBridge(tempDir)
    } else {
      info('Network air gap is enabled, skipping bridge CLI download.')
      await sb.validateBridgePath()
    }
    // Execute bridge command
    exitCode = await sb.executeBridgeCommand(formattedCommand, getGitHubWorkspaceDirV2())
    // The statement set the exit code in the 'status' variable which can be used in the YAML file
    if (parseToBoolean(inputs.RETURN_STATUS)) {
      debug(`Setting output variable ${constants.TASK_RETURN_STATUS} with exit code ${exitCode}`)
      setOutput(constants.TASK_RETURN_STATUS, exitCode)
    }
  } catch (error) {
    throw error
  } finally {
    const uploadSarifReportBasedOnExitCode = exitCode === 0 || exitCode === 8
    debug(`Bridge CLI execution completed: ${isBridgeExecuted}`)
    if (isBridgeExecuted) {
      if (inputs.INCLUDE_DIAGNOSTICS) {
        await uploadDiagnostics()
      }
      if (!isPullRequestEvent() && uploadSarifReportBasedOnExitCode) {
        // Upload Black Duck sarif file as GitHub artifact
        if (inputs.BLACKDUCKSCA_URL && parseToBoolean(inputs.BLACKDUCKSCA_REPORTS_SARIF_CREATE)) {
          await uploadSarifReportAsArtifact(constants.BLACKDUCK_SARIF_GENERATOR_DIRECTORY, inputs.BLACKDUCKSCA_REPORTS_SARIF_FILE_PATH, constants.BLACKDUCK_SARIF_ARTIFACT_NAME)
        }

        // Upload Polaris sarif file as GitHub artifact
        if (inputs.POLARIS_SERVER_URL && parseToBoolean(inputs.POLARIS_REPORTS_SARIF_CREATE)) {
          await uploadSarifReportAsArtifact(constants.POLARIS_SARIF_GENERATOR_DIRECTORY, inputs.POLARIS_REPORTS_SARIF_FILE_PATH, constants.POLARIS_SARIF_ARTIFACT_NAME)
        }
        if (!isNullOrEmptyValue(inputs.GITHUB_TOKEN)) {
          // Upload Black Duck SARIF Report to code scanning tab
          if (inputs.BLACKDUCKSCA_URL && parseToBoolean(inputs.BLACKDUCK_UPLOAD_SARIF_REPORT)) {
            const gitHubClientService = await GitHubClientServiceFactory.getGitHubClientServiceInstance()
            await gitHubClientService.uploadSarifReport(constants.BLACKDUCK_SARIF_GENERATOR_DIRECTORY, inputs.BLACKDUCKSCA_REPORTS_SARIF_FILE_PATH)
          }
          // Upload Polaris SARIF Report to code scanning tab
          if (inputs.POLARIS_SERVER_URL && parseToBoolean(inputs.POLARIS_UPLOAD_SARIF_REPORT)) {
            const gitHubClientService = await GitHubClientServiceFactory.getGitHubClientServiceInstance()
            await gitHubClientService.uploadSarifReport(constants.POLARIS_SARIF_GENERATOR_DIRECTORY, inputs.POLARIS_REPORTS_SARIF_FILE_PATH)
          }
        }
      }
    }
    await cleanupTempDir(tempDir)
  }
}

export function logBridgeExitCodes(message: string): string {
  const exitCode = message.trim().slice(-1)
  return constants.EXIT_CODE_MAP.has(exitCode) ? `Exit Code: ${exitCode} ${constants.EXIT_CODE_MAP.get(exitCode)}` : message
}

export function getBridgeExitCodeAsNumericValue(error: Error): number {
  if (error.message !== undefined) {
    const lastChar = error.message.trim().slice(-1)
    const exitCode = parseInt(lastChar)
    return isNaN(exitCode) ? -1 : exitCode
  }
  return -1
}

export function getBridgeExitCode(error: Error): boolean {
  if (error.message !== undefined) {
    const lastChar = error.message.trim().slice(-1)
    const num = parseFloat(lastChar)
    return !isNaN(num)
  }
  return false
}

export function markBuildStatusIfIssuesArePresent(status: number, taskResult: string, errorMessage: string): void {
  const exitMessage = logBridgeExitCodes(errorMessage)

  if (status === constants.BRIDGE_BREAK_EXIT_CODE) {
    info(errorMessage)
    if (taskResult === constants.BUILD_STATUS.SUCCESS) {
      info(exitMessage)
    }
    info(`Marking the build ${taskResult} as configured in the task.`)
    isBridgeExecuted = true
  } else {
    setFailed('Workflow failed! '.concat(logBridgeExitCodes(errorMessage)))
  }
}

run().catch(error => {
  if (error.message !== undefined) {
    const isReturnStatusEnabled = parseToBoolean(inputs.RETURN_STATUS)
    const exitCode = getBridgeExitCodeAsNumericValue(error)

    if (isReturnStatusEnabled) {
      debug(`Setting output variable ${constants.TASK_RETURN_STATUS} with exit code ${exitCode}`)
      setOutput(constants.TASK_RETURN_STATUS, exitCode)
    }

    const taskResult: string | undefined = checkJobResult(inputs.MARK_BUILD_STATUS)

    if (taskResult !== undefined && taskResult !== constants.BUILD_STATUS.FAILURE) {
      markBuildStatusIfIssuesArePresent(exitCode, taskResult, error.message)
    } else {
      setFailed('Workflow failed! '.concat(logBridgeExitCodes(error.message)))
    }
  }
})
