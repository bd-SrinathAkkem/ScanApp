import {logBridgeExitCodes, run} from '../../src/main'
import * as inputs from '../../src/blackduck-security-action/inputs'
import {Bridge} from '../../src/blackduck-security-action/bridge-cli'
import {DownloadFileResponse} from '../../src/blackduck-security-action/download-utility'
import * as downloadUtility from './../../src/blackduck-security-action/download-utility'
import * as configVariables from 'actions-artifact-v2/lib/internal/shared/config'
import * as diagnostics from '../../src/blackduck-security-action/artifacts'
import {UploadArtifactResponse} from 'actions-artifact-v2'
import {GithubClientServiceBase} from '../../src/blackduck-security-action/service/impl/github-client-service-base'
import * as utility from '../../src/blackduck-security-action/utility'
import {GitHubClientServiceFactory} from '../../src/blackduck-security-action/factory/github-client-service-factory'
import {GithubClientServiceCloud} from '../../src/blackduck-security-action/service/impl/cloud/github-client-service-cloud'
import fs from 'fs'
import * as core from '@actions/core'

jest.mock('@actions/core')
jest.mock('@actions/io', () => ({
  rmRF: jest.fn()
}))

beforeEach(() => {
  Object.defineProperty(inputs, 'GITHUB_TOKEN', {value: 'token'})
  process.env['GITHUB_REPOSITORY'] = 'blackduck-security-action'
  process.env['GITHUB_REF_NAME'] = 'branch-name'
  process.env['GITHUB_REF'] = 'refs/pull/1/merge'
  process.env['GITHUB_REPOSITORY_OWNER'] = 'blackduck-inc'
  jest.resetModules()
  const uploadResponse: UploadArtifactResponse = {size: 0, id: 123}
  jest.spyOn(diagnostics, 'uploadDiagnostics').mockResolvedValueOnce(uploadResponse)
  jest.spyOn(fs, 'renameSync').mockReturnValue()
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('Black Duck Security Action: Handling isBridgeExecuted and Exit Code Information Messages', () => {
  const setupBlackDuckInputs = (extraInputs: Record<string, any> = {}) => {
    Object.defineProperty(inputs, 'BLACKDUCKSCA_URL', {value: 'BLACKDUCKSCA_URL'})
    Object.defineProperty(inputs, 'BLACKDUCKSCA_TOKEN', {value: 'BLACKDUCKSCA_TOKEN'})
    Object.defineProperty(inputs, 'DETECT_INSTALL_DIRECTORY', {value: 'DETECT_INSTALL_DIRECTORY'})
    Object.defineProperty(inputs, 'DETECT_SCAN_FULL', {value: 'TRUE'})
    Object.defineProperty(inputs, 'BLACKDUCKSCA_SCAN_FAILURE_SEVERITIES', {value: 'ALL'})
    Object.defineProperty(inputs, 'BLACKDUCKSCA_FIXPR_ENABLED', {value: 'false'})
    Object.defineProperty(inputs, 'BLACKDUCKSCA_PRCOMMENT_ENABLED', {value: true})
    Object.defineProperty(inputs, 'RETURN_STATUS', {value: true})
    for (const [key, value] of Object.entries(extraInputs)) {
      Object.defineProperty(inputs, key, {value, writable: true})
    }
  }

  const setupMocks = (exitCode: number) => {
    jest.spyOn(Bridge.prototype, 'getBridgeVersionFromLatestURL').mockResolvedValueOnce('0.1.0')
    const downloadFileResp: DownloadFileResponse = {
      filePath: 'C://user/temp/download/',
      fileName: 'C://user/temp/download/bridge-win.zip'
    }
    jest.spyOn(downloadUtility, 'getRemoteFile').mockResolvedValueOnce(downloadFileResp)
    jest.spyOn(downloadUtility, 'extractZipped').mockResolvedValueOnce(true)
    jest.spyOn(configVariables, 'getGitHubWorkspaceDir').mockReturnValueOnce('/home/bridge')
    jest.spyOn(Bridge.prototype, 'executeBridgeCommand').mockResolvedValueOnce(exitCode)
    const uploadResponse: UploadArtifactResponse = {size: 0, id: 123}
    jest.spyOn(diagnostics, 'uploadDiagnostics').mockResolvedValueOnce(uploadResponse)
  }

  afterEach(() => {
    Object.defineProperty(inputs, 'BLACKDUCKSCA_URL', {value: null})
  })

  it('handles successful execution with exitCode 0', async () => {
    setupBlackDuckInputs()
    setupMocks(0)
    const response = await run()

    expect(response).toBe(0)
    expect(core.info).toHaveBeenCalledWith('Black Duck Security Action workflow execution completed successfully.')
    expect(core.setOutput).toHaveBeenCalledWith('status', 0)
    expect(core.debug).toHaveBeenCalledWith('Bridge CLI execution completed: true')
  })

  it('handles issues detected but marked as success with exitCode 8', async () => {
    setupBlackDuckInputs({MARK_BUILD_STATUS: 'success'})
    setupMocks(8)
    jest.spyOn(utility, 'checkJobResult').mockReturnValue('success')

    const response = await run()

    expect(response).toBe(8)
    expect(core.info).toHaveBeenCalledWith(expect.stringContaining('Marking the build success as configured in the task.'))
    expect(core.setOutput).toHaveBeenCalledWith('status', 8)
    expect(core.debug).toHaveBeenCalledWith('Bridge CLI execution completed: true')
  })

  it('handles failure case with exitCode 2', async () => {
    setupBlackDuckInputs()
    setupMocks(2)

    const response = await run()
    expect(response).toBe(2)
    expect(core.setOutput).toHaveBeenCalledWith('status', 2)
    expect(core.debug).toHaveBeenCalledWith('Bridge CLI execution completed: false')
  })

  it('uploads SARIF report for exitCode 8', async () => {
    setupBlackDuckInputs({
      BLACKDUCKSCA_REPORTS_SARIF_CREATE: 'true',
      BLACKDUCKSCA_REPORTS_SARIF_FILE_PATH: '/',
      MARK_BUILD_STATUS: 'success'
    })
    setupMocks(8)
    jest.spyOn(utility, 'checkJobResult').mockReturnValue('success')
    jest.spyOn(utility, 'isPullRequestEvent').mockReturnValue(false)
    const uploadResponse: UploadArtifactResponse = {size: 0, id: 123}
    jest.spyOn(diagnostics, 'uploadSarifReportAsArtifact').mockResolvedValueOnce(uploadResponse)

    await run()
    expect(diagnostics.uploadSarifReportAsArtifact).toHaveBeenCalledWith('Blackduck SCA SARIF Generator', '/', 'blackduck_sarif_report')
  })
})
