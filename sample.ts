// main.test.ts (New Test Cases Section)

// Add these imports if not already present
import { logBridgeExitCodes, run } from '../../src/main';
import * as inputs from '../../src/blackduck-security-action/inputs';
import { Bridge } from '../../src/blackduck-security-action/bridge-cli';
import { DownloadFileResponse } from '../../src/blackduck-security-action/download-utility';
import * as downloadUtility from './../../src/blackduck-security-action/download-utility';
import * as configVariables from 'actions-artifact-v2/lib/internal/shared/config';
import * as diagnostics from '../../src/blackduck-security-action/artifacts';
import { UploadArtifactResponse } from 'actions-artifact-v2';
import * as utility from '../../src/blackduck-security-action/utility';
import { GitHubClientServiceFactory } from '../../src/blackduck-security-action/factory/github-client-service-factory';
import fs from 'fs';
import { debug, info, setFailed, setOutput, getInput } from '@actions/core';

// New Test Cases for [SIGINT-2798]
describe('Black Duck Security Action - [SIGINT-2798] Scenarios', () => {
  test('Successful scan with SUCCESS and exit code 0', async () => {
    Object.defineProperty(inputs, 'BLACKDUCKSCA_URL', { value: 'BLACKDUCKSCA_URL', writable: true });
    Object.defineProperty(inputs, 'BLACKDUCKSCA_TOKEN', { value: 'BLACKDUCKSCA_TOKEN', writable: true });
    jest.spyOn(require('@actions/core'), 'getInput').mockImplementation((key: string) => 
      key === 'mark_build_status' ? 'SUCCESS' : key === 'return_status' ? 'true' : ''
    );

    jest.spyOn(Bridge.prototype, 'getBridgeVersionFromLatestURL').mockResolvedValueOnce('0.1.0');
    const downloadFileResp: DownloadFileResponse = { filePath: 'C://user/temp/download/', fileName: 'C://user/temp/download/bridge-win.zip' };
    jest.spyOn(downloadUtility, 'getRemoteFile').mockResolvedValueOnce(downloadFileResp);
    jest.spyOn(downloadUtility, 'extractZipped').mockResolvedValueOnce(true);
    jest.spyOn(configVariables, 'getGitHubWorkspaceDir').mockReturnValueOnce('/home/bridge');
    jest.spyOn(Bridge.prototype, 'executeBridgeCommand').mockResolvedValueOnce(0);

    const response = await run();
    expect(response).toBe(0);
    expect(info).toHaveBeenCalledWith('Black Duck Security Action workflow execution completed.');
    expect(setOutput).toHaveBeenCalledWith('exit_code', 0);
    expect(setFailed).not.toHaveBeenCalled();
  });

  test('Policy violation with SUCCESS overrides to success (exit code 8)', async () => {
    Object.defineProperty(inputs, 'BLACKDUCKSCA_URL', { value: 'BLACKDUCKSCA_URL', writable: true });
    Object.defineProperty(inputs, 'BLACKDUCKSCA_TOKEN', { value: 'BLACKDUCKSCA_TOKEN', writable: true });
    jest.spyOn(require('@actions/core'), 'getInput').mockImplementation((key: string) => 
      key === 'mark_build_status' ? 'SUCCESS' : key === 'return_status' ? 'true' : ''
    );

    jest.spyOn(Bridge.prototype, 'getBridgeVersionFromLatestURL').mockResolvedValueOnce('0.1.0');
    const downloadFileResp: DownloadFileResponse = { filePath: 'C://user/temp/download/', fileName: 'C://user/temp/download/bridge-win.zip' };
    jest.spyOn(downloadUtility, 'getRemoteFile').mockResolvedValueOnce(downloadFileResp);
    jest.spyOn(downloadUtility, 'extractZipped').mockResolvedValueOnce(true);
    jest.spyOn(configVariables, 'getGitHubWorkspaceDir').mockReturnValueOnce('/home/bridge');
    jest.spyOn(Bridge.prototype, 'executeBridgeCommand').mockResolvedValueOnce(8);

    const response = await run();
    expect(response).toBe(0);
    expect(info).toHaveBeenCalledWith('Black Duck Security Action workflow execution completed.');
    expect(setOutput).toHaveBeenCalledWith('exit_code', 8);
    expect(setFailed).not.toHaveBeenCalled();
  });

  test('Policy violation with UNSTABLE (exit code 8)', async () => {
    Object.defineProperty(inputs, 'BLACKDUCKSCA_URL', { value: 'BLACKDUCKSCA_URL', writable: true });
    Object.defineProperty(inputs, 'BLACKDUCKSCA_TOKEN', { value: 'BLACKDUCKSCA_TOKEN', writable: true });
    Object.defineProperty(inputs, 'BLACKDUCKSCA_PRCOMMENT_ENABLED', { value: 'true', writable: true });
    jest.spyOn(require('@actions/core'), 'getInput').mockImplementation((key: string) => 
      key === 'mark_build_status' ? 'UNSTABLE' : key === 'return_status' ? 'true' : ''
    );

    jest.spyOn(Bridge.prototype, 'getBridgeVersionFromLatestURL').mockResolvedValueOnce('0.1.0');
    const downloadFileResp: DownloadFileResponse = { filePath: 'C://user/temp/download/', fileName: 'C://user/temp/download/bridge-win.zip' };
    jest.spyOn(downloadUtility, 'getRemoteFile').mockResolvedValueOnce(downloadFileResp);
    jest.spyOn(downloadUtility, 'extractZipped').mockResolvedValueOnce(true);
    jest.spyOn(configVariables, 'getGitHubWorkspaceDir').mockReturnValueOnce('/home/bridge');
    jest.spyOn(Bridge.prototype, 'executeBridgeCommand').mockResolvedValueOnce(8);
    jest.spyOn(GitHubClientServiceFactory, 'getGitHubClientServiceInstance').mockResolvedValueOnce({
      uploadSarifReport: jest.fn().mockResolvedValue(undefined),
    } as any);

    const response = await run();
    expect(response).toBe(0);
    expect(info).toHaveBeenCalledWith('::warning::Policy violations detected (Exit Code: 8), treated as unstable (non-failing)');
    expect(setOutput).toHaveBeenCalledWith('exit_code', 8);
    expect(setFailed).not.toHaveBeenCalled();
  });

  test('Policy violation with FAILURE and continue-on-error warning (exit code 8)', async () => {
    Object.defineProperty(inputs, 'BLACKDUCKSCA_URL', { value: 'BLACKDUCKSCA_URL', writable: true });
    Object.defineProperty(inputs, 'BLACKDUCKSCA_TOKEN', { value: 'BLACKDUCKSCA_TOKEN', writable: true });
    jest.spyOn(require('@actions/core'), 'getInput').mockImplementation((key: string) => 
      key === 'mark_build_status' ? 'FAILURE' : key === 'return_status' ? 'true' : ''
    );

    jest.spyOn(Bridge.prototype, 'getBridgeVersionFromLatestURL').mockResolvedValueOnce('0.1.0');
    const downloadFileResp: DownloadFileResponse = { filePath: 'C://user/temp/download/', fileName: 'C://user/temp/download/bridge-win.zip' };
    jest.spyOn(downloadUtility, 'getRemoteFile').mockResolvedValueOnce(downloadFileResp);
    jest.spyOn(downloadUtility, 'extractZipped').mockResolvedValueOnce(true);
    jest.spyOn(configVariables, 'getGitHubWorkspaceDir').mockReturnValueOnce('/home/bridge');
    jest.spyOn(Bridge.prototype, 'executeBridgeCommand').mockResolvedValueOnce(8);

    await expect(run()).rejects.toThrow('Workflow failed! Exit Code: 8 Policy Violation Detected');
    expect(info).toHaveBeenCalledWith('::warning::Policy violations detected (Exit Code: 8), treated as failure');
    expect(info).toHaveBeenCalledWith('::warning::Build failed with Exit Code: 8 Policy Violation Detected. Workflow continues due to \'continue-on-error\' if enabled in pipeline.');
    expect(setOutput).toHaveBeenCalledWith('exit_code', 8);
    expect(setFailed).toHaveBeenCalledWith('Workflow failed! Exit Code: 8 Policy Violation Detected');
  });

  test('Unexpected error with FAILURE (exit code -1)', async () => {
    Object.defineProperty(inputs, 'BLACKDUCKSCA_URL', { value: 'BLACKDUCKSCA_URL', writable: true });
    Object.defineProperty(inputs, 'BLACKDUCKSCA_TOKEN', { value: 'BLACKDUCKSCA_TOKEN', writable: true });
    jest.spyOn(require('@actions/core'), 'getInput').mockImplementation((key: string) => 
      key === 'mark_build_status' ? 'FAILURE' : key === 'return_status' ? 'true' : ''
    );

    jest.spyOn(Bridge.prototype, 'getBridgeVersionFromLatestURL').mockResolvedValueOnce('0.1.0');
    const downloadFileResp: DownloadFileResponse = { filePath: 'C://user/temp/download/', fileName: 'C://user/temp/download/bridge-win.zip' };
    jest.spyOn(downloadUtility, 'getRemoteFile').mockResolvedValueOnce(downloadFileResp);
    jest.spyOn(downloadUtility, 'extractZipped').mockResolvedValueOnce(true);
    jest.spyOn(configVariables, 'getGitHubWorkspaceDir').mockReturnValueOnce('/home/bridge');
    jest.spyOn(Bridge.prototype, 'executeBridgeCommand').mockRejectedValueOnce(new Error('Unexpected error'));

    await expect(run()).rejects.toThrow('Workflow failed! Unknown exit code: -1');
    expect(info).toHaveBeenCalledWith('::warning::Bridge CLI failed with Unknown exit code: -1');
    expect(info).toHaveBeenCalledWith('::warning::Build failed with Unknown exit code: -1. Workflow continues due to \'continue-on-error\' if enabled in pipeline.');
    expect(setOutput).toHaveBeenCalledWith('exit_code', -1);
    expect(setFailed).toHaveBeenCalledWith('Workflow failed! Unknown exit code: -1');
  });

  test('SARIF upload with diagnostics on success (exit code 0)', async () => {
    Object.defineProperty(inputs, 'BLACKDUCKSCA_URL', { value: 'BLACKDUCKSCA_URL', writable: true });
    Object.defineProperty(inputs, 'BLACKDUCKSCA_TOKEN', { value: 'BLACKDUCKSCA_TOKEN', writable: true });
    Object.defineProperty(inputs, 'BLACKDUCKSCA_REPORTS_SARIF_CREATE', { value: 'true', writable: true });
    Object.defineProperty(inputs, 'INCLUDE_DIAGNOSTICS', { value: 'true', writable: true });
    jest.spyOn(require('@actions/core'), 'getInput').mockImplementation((key: string) => 
      key === 'mark_build_status' ? 'SUCCESS' : key === 'return_status' ? 'true' : ''
    );

    jest.spyOn(Bridge.prototype, 'getBridgeVersionFromLatestURL').mockResolvedValueOnce('0.1.0');
    const downloadFileResp: DownloadFileResponse = { filePath: 'C://user/temp/download/', fileName: 'C://user/temp/download/bridge-win.zip' };
    jest.spyOn(downloadUtility, 'getRemoteFile').mockResolvedValueOnce(downloadFileResp);
    jest.spyOn(downloadUtility, 'extractZipped').mockResolvedValueOnce(true);
    jest.spyOn(configVariables, 'getGitHubWorkspaceDir').mockReturnValueOnce('/home/bridge');
    jest.spyOn(Bridge.prototype, 'executeBridgeCommand').mockResolvedValueOnce(0);
    jest.spyOn(utility, 'isPullRequestEvent').mockReturnValueOnce(false);
    jest.spyOn(diagnostics, 'uploadSarifReportAsArtifact').mockResolvedValueOnce(undefined);

    const response = await run();
    expect(response).toBe(0);
    expect(diagnostics.uploadDiagnostics).toHaveBeenCalled();
    expect(diagnostics.uploadSarifReportAsArtifact).toHaveBeenCalledWith(
      expect.any(String),
      inputs.BLACKDUCKSCA_REPORTS_SARIF_FILE_PATH,
      expect.any(String)
    );
    expect(setOutput).toHaveBeenCalledWith('exit_code', 0);
  });

  test('SARIF upload with diagnostics on policy violation with UNSTABLE (exit code 8)', async () => {
    Object.defineProperty(inputs, 'BLACKDUCKSCA_URL', { value: 'BLACKDUCKSCA_URL', writable: true });
    Object.defineProperty(inputs, 'BLACKDUCKSCA_TOKEN', { value: 'BLACKDUCKSCA_TOKEN', writable: true });
    Object.defineProperty(inputs, 'BLACKDUCKSCA_REPORTS_SARIF_CREATE', { value: 'true', writable: true });
    Object.defineProperty(inputs, 'INCLUDE_DIAGNOSTICS', { value: 'true', writable: true });
    jest.spyOn(require('@actions/core'), 'getInput').mockImplementation((key: string) => 
      key === 'mark_build_status' ? 'UNSTABLE' : key === 'return_status' ? 'true' : ''
    );

    jest.spyOn(Bridge.prototype, 'getBridgeVersionFromLatestURL').mockResolvedValueOnce('0.1.0');
    const downloadFileResp: DownloadFileResponse = { filePath: 'C://user/temp/download/', fileName: 'C://user/temp/download/bridge-win.zip' };
    jest.spyOn(downloadUtility, 'getRemoteFile').mockResolvedValueOnce(downloadFileResp);
    jest.spyOn(downloadUtility, 'extractZipped').mockResolvedValueOnce(true);
    jest.spyOn(configVariables, 'getGitHubWorkspaceDir').mockReturnValueOnce('/home/bridge');
    jest.spyOn(Bridge.prototype, 'executeBridgeCommand').mockResolvedValueOnce(8);
    jest.spyOn(utility, 'isPullRequestEvent').mockReturnValueOnce(false);
    jest.spyOn(diagnostics, 'uploadSarifReportAsArtifact').mockResolvedValueOnce(undefined);

    const response = await run();
    expect(response).toBe(0);
    expect(info).toHaveBeenCalledWith('::warning::Policy violations detected (Exit Code: 8), treated as unstable (non-failing)');
    expect(diagnostics.uploadDiagnostics).toHaveBeenCalled();
    expect(diagnostics.uploadSarifReportAsArtifact).toHaveBeenCalledWith(
      expect.any(String),
      inputs.BLACKDUCKSCA_REPORTS_SARIF_FILE_PATH,
      expect.any(String)
    );
    expect(setOutput).toHaveBeenCalledWith('exit_code', 8);
  });

  test('No SARIF upload on failure with FAILURE (exit code 8)', async () => {
    Object.defineProperty(inputs, 'BLACKDUCKSCA_URL', { value: 'BLACKDUCKSCA_URL', writable: true });
    Object.defineProperty(inputs, 'BLACKDUCKSCA_TOKEN', { value: 'BLACKDUCKSCA_TOKEN', writable: true });
    Object.defineProperty(inputs, 'BLACKDUCKSCA_REPORTS_SARIF_CREATE', { value: 'true', writable: true });
    Object.defineProperty(inputs, 'INCLUDE_DIAGNOSTICS', { value: 'true', writable: true });
    jest.spyOn(require('@actions/core'), 'getInput').mockImplementation((key: string) => 
      key === 'mark_build_status' ? 'FAILURE' : key === 'return_status' ? 'true' : ''
    );

    jest.spyOn(Bridge.prototype, 'getBridgeVersionFromLatestURL').mockResolvedValueOnce('0.1.0');
    const downloadFileResp: DownloadFileResponse = { filePath: 'C://user/temp/download/', fileName: 'C://user/temp/download/bridge-win.zip' };
    jest.spyOn(downloadUtility, 'getRemoteFile').mockResolvedValueOnce(downloadFileResp);
    jest.spyOn(downloadUtility, 'extractZipped').mockResolvedValueOnce(true);
    jest.spyOn(configVariables, 'getGitHubWorkspaceDir').mockReturnValueOnce('/home/bridge');
    jest.spyOn(Bridge.prototype, 'executeBridgeCommand').mockResolvedValueOnce(8);

    await expect(run()).rejects.toThrow('Workflow failed! Exit Code: 8 Policy Violation Detected');
    expect(info).toHaveBeenCalledWith('::warning::Policy violations detected (Exit Code: 8), treated as failure');
    expect(diagnostics.uploadDiagnostics).not.toHaveBeenCalled();
    expect(diagnostics.uploadSarifReportAsArtifact).not.toHaveBeenCalled();
    expect(setOutput).toHaveBeenCalledWith('exit_code', 8);
  });

  test('Network air gap enabled with SUCCESS (exit code 0)', async () => {
    Object.defineProperty(inputs, 'BLACKDUCKSCA_URL', { value: 'BLACKDUCKSCA_URL', writable: true });
    Object.defineProperty(inputs, 'BLACKDUCKSCA_TOKEN', { value: 'BLACKDUCKSCA_TOKEN', writable: true });
    Object.defineProperty(inputs, 'ENABLE_NETWORK_AIR_GAP', { value: true, writable: true });
    jest.spyOn(require('@actions/core'), 'getInput').mockImplementation((key: string) => 
      key === 'mark_build_status' ? 'SUCCESS' : key === 'return_status' ? 'true' : ''
    );

    jest.spyOn(Bridge.prototype, 'validateBridgePath').mockResolvedValueOnce(undefined);
    jest.spyOn(configVariables, 'getGitHubWorkspaceDir').mockReturnValueOnce('/home/bridge');
    jest.spyOn(Bridge.prototype, 'executeBridgeCommand').mockResolvedValueOnce(0);

    const response = await run();
    expect(response).toBe(0);
    expect(info).toHaveBeenCalledWith('Network air gap is enabled, skipping bridge CLI download.');
    expect(Bridge.prototype.validateBridgePath).toHaveBeenCalled();
    expect(downloadUtility.getRemoteFile).not.toHaveBeenCalled();
    expect(setOutput).toHaveBeenCalledWith('exit_code', 0);
  });

  test('PR comment enabled with UNSTABLE on PR event (exit code 8)', async () => {
    Object.defineProperty(inputs, 'BLACKDUCKSCA_URL', { value: 'BLACKDUCKSCA_URL', writable: true });
    Object.defineProperty(inputs, 'BLACKDUCKSCA_TOKEN', { value: 'BLACKDUCKSCA_TOKEN', writable: true });
    Object.defineProperty(inputs, 'BLACKDUCKSCA_PRCOMMENT_ENABLED', { value: 'true', writable: true });
    Object.defineProperty(inputs, 'GITHUB_TOKEN', { value: 'github-token', writable: true });
    jest.spyOn(require('@actions/core'), 'getInput').mockImplementation((key: string) => 
      key === 'mark_build_status' ? 'UNSTABLE' : key === 'return_status' ? 'true' : ''
    );

    jest.spyOn(Bridge.prototype, 'getBridgeVersionFromLatestURL').mockResolvedValueOnce('0.1.0');
    const downloadFileResp: DownloadFileResponse = { filePath: 'C://user/temp/download/', fileName: 'C://user/temp/download/bridge-win.zip' };
    jest.spyOn(downloadUtility, 'getRemoteFile').mockResolvedValueOnce(downloadFileResp);
    jest.spyOn(downloadUtility, 'extractZipped').mockResolvedValueOnce(true);
    jest.spyOn(configVariables, 'getGitHubWorkspaceDir').mockReturnValueOnce('/home/bridge');
    jest.spyOn(Bridge.prototype, 'executeBridgeCommand').mockResolvedValueOnce(8);
    jest.spyOn(utility, 'isPullRequestEvent').mockReturnValueOnce(true); // PR event
    jest.spyOn(GitHubClientServiceFactory, 'getGitHubClientServiceInstance').mockResolvedValueOnce({
      uploadSarifReport: jest.fn().mockResolvedValue(undefined),
    } as any);

    const response = await run();
    expect(response).toBe(0);
    expect(info).toHaveBeenCalledWith('::warning::Policy violations detected (Exit Code: 8), treated as unstable (non-failing)');
    expect(GitHubClientServiceFactory.getGitHubClientServiceInstance).toHaveBeenCalled();
    expect(setOutput).toHaveBeenCalledWith('exit_code', 8);
  });

  test('No output set when return_status is false (exit code 0)', async () => {
    Object.defineProperty(inputs, 'BLACKDUCKSCA_URL', { value: 'BLACKDUCKSCA_URL', writable: true });
    Object.defineProperty(inputs, 'BLACKDUCKSCA_TOKEN', { value: 'BLACKDUCKSCA_TOKEN', writable: true });
    jest.spyOn(require('@actions/core'), 'getInput').mockImplementation((key: string) => 
      key === 'mark_build_status' ? 'SUCCESS' : key === 'return_status' ? 'false' : ''
    );

    jest.spyOn(Bridge.prototype, 'getBridgeVersionFromLatestURL').mockResolvedValueOnce('0.1.0');
    const downloadFileResp: DownloadFileResponse = { filePath: 'C://user/temp/download/', fileName: 'C://user/temp/download/bridge-win.zip' };
    jest.spyOn(downloadUtility, 'getRemoteFile').mockResolvedValueOnce(downloadFileResp);
    jest.spyOn(downloadUtility, 'extractZipped').mockResolvedValueOnce(true);
    jest.spyOn(configVariables, 'getGitHubWorkspaceDir').mockReturnValueOnce('/home/bridge');
    jest.spyOn(Bridge.prototype, 'executeBridgeCommand').mockResolvedValueOnce(0);

    const response = await run();
    expect(response).toBe(0);
    expect(info).toHaveBeenCalledWith('Black Duck Security Action workflow execution completed.');
    expect(setOutput).not.toHaveBeenCalled();
  });

  test('Invalid mark_build_status value defaults to FAILURE (exit code 8)', async () => {
    Object.defineProperty(inputs, 'BLACKDUCKSCA_URL', { value: 'BLACKDUCKSCA_URL', writable: true });
    Object.defineProperty(inputs, 'BLACKDUCKSCA_TOKEN', { value: 'BLACKDUCKSCA_TOKEN', writable: true });
    jest.spyOn(require('@actions/core'), 'getInput').mockImplementation((key: string) => 
      key === 'mark_build_status' ? 'INVALID' : key === 'return_status' ? 'true' : ''
    );

    jest.spyOn(Bridge.prototype, 'getBridgeVersionFromLatestURL').mockResolvedValueOnce('0.1.0');
    const downloadFileResp: DownloadFileResponse = { filePath: 'C://user/temp/download/', fileName: 'C://user/temp/download/bridge-win.zip' };
    jest.spyOn(downloadUtility, 'getRemoteFile').mockResolvedValueOnce(downloadFileResp);
    jest.spyOn(downloadUtility, 'extractZipped').mockResolvedValueOnce(true);
    jest.spyOn(configVariables, 'getGitHubWorkspaceDir').mockReturnValueOnce('/home/bridge');
    jest.spyOn(Bridge.prototype, 'executeBridgeCommand').mockResolvedValueOnce(8);

    await expect(run()).rejects.toThrow('Workflow failed! Exit Code: 8 Policy Violation Detected');
    expect(info).toHaveBeenCalledWith('::warning::Policy violations detected (Exit Code: 8), treated as failure');
    expect(setOutput).toHaveBeenCalledWith('exit_code', 8);
    expect(setFailed).toHaveBeenCalledWith('Workflow failed! Exit Code: 8 Policy Violation Detected');
  });
});
