test('isBridgeExecuted and info message handling', async () => {
  // Arrange: Configure inputs for Black Duck flow
  Object.defineProperty(inputs, 'BLACKDUCKSCA_URL', {value: 'BLACKDUCKSCA_URL'})
  Object.defineProperty(inputs, 'BLACKDUCKSCA_TOKEN', {value: 'BLACKDUCKSCA_TOKEN'})
  Object.defineProperty(inputs, 'DETECT_INSTALL_DIRECTORY', {value: 'DETECT_INSTALL_DIRECTORY'})
  Object.defineProperty(inputs, 'DETECT_SCAN_FULL', {value: 'TRUE'})
  Object.defineProperty(inputs, 'BLACKDUCKSCA_SCAN_FAILURE_SEVERITIES', {value: 'ALL'})
  Object.defineProperty(inputs, 'BLACKDUCKSCA_FIXPR_ENABLED', {value: 'false'})
  Object.defineProperty(inputs, 'BLACKDUCKSCA_PRCOMMENT_ENABLED', {value: true})

  jest.spyOn(Bridge.prototype, 'getBridgeVersionFromLatestURL').mockResolvedValueOnce('0.1.0')
  const downloadFileResp: DownloadFileResponse = {filePath: 'C://user/temp/download/', fileName: 'C://user/temp/download/bridge-win.zip'}
  jest.spyOn(downloadUtility, 'getRemoteFile').mockResolvedValueOnce(downloadFileResp)
  jest.spyOn(downloadUtility, 'extractZipped').mockResolvedValueOnce(true)
  jest.spyOn(configVariables, 'getGitHubWorkspaceDir').mockReturnValueOnce('/home/bridge')
  jest.spyOn(Bridge.prototype, 'executeBridgeCommand').mockResolvedValueOnce(0)
  const uploadResponse: UploadArtifactResponse = {size: 0, id: 123}
  jest.spyOn(diagnostics, 'uploadDiagnostics').mockResolvedValueOnce(uploadResponse)

  // Case 1: exitCode === 0 (successful execution)
  const response = await run()
  expect(response).not.toBe(null)
  expect(core.info).toHaveBeenCalledWith(
      'Black Duck Security Action workflow execution completed successfully.'
  );
  expect(core.setOutput).toHaveBeenCalledWith('status', 0);
  Object.defineProperty(inputs, 'BLACKDUCKSCA_URL', {value: null})
});

test('isBridgeExecuted and info message handling', async () => {
  // Arrange: Configure inputs for Black Duck flow
  Object.defineProperty(inputs, 'BLACKDUCKSCA_URL', {value: 'BLACKDUCKSCA_URL'})
  Object.defineProperty(inputs, 'BLACKDUCKSCA_TOKEN', {value: 'BLACKDUCKSCA_TOKEN'})
  Object.defineProperty(inputs, 'DETECT_INSTALL_DIRECTORY', {value: 'DETECT_INSTALL_DIRECTORY'})
  Object.defineProperty(inputs, 'DETECT_SCAN_FULL', {value: 'TRUE'})
  Object.defineProperty(inputs, 'BLACKDUCKSCA_SCAN_FAILURE_SEVERITIES', {value: 'ALL'})
  Object.defineProperty(inputs, 'BLACKDUCKSCA_FIXPR_ENABLED', {value: 'false'})
  Object.defineProperty(inputs, 'BLACKDUCKSCA_PRCOMMENT_ENABLED', {value: true})
  Object.defineProperty(inputs, 'MARK_BUILD_STATUS', {value: 'success'})

  jest.spyOn(Bridge.prototype, 'getBridgeVersionFromLatestURL').mockResolvedValueOnce('0.1.0')
  const downloadFileResp: DownloadFileResponse = {filePath: 'C://user/temp/download/', fileName: 'C://user/temp/download/bridge-win.zip'}
  jest.spyOn(downloadUtility, 'getRemoteFile').mockResolvedValueOnce(downloadFileResp)
  jest.spyOn(downloadUtility, 'extractZipped').mockResolvedValueOnce(true)
  jest.spyOn(configVariables, 'getGitHubWorkspaceDir').mockReturnValueOnce('/home/bridge')
  jest.spyOn(Bridge.prototype, 'executeBridgeCommand').mockResolvedValueOnce(8)
  jest.spyOn(utility, 'checkJobResult').mockReturnValueOnce("success")
  const uploadResponse: UploadArtifactResponse = {size: 0, id: 123}
  jest.spyOn(diagnostics, 'uploadDiagnostics').mockResolvedValueOnce(uploadResponse)

  //  Case 2: exitCode === 8 (issues detected, but marked as success)
  const response = await run()
  expect(response).not.toBe(null)
  expect(core.info).toHaveBeenCalledWith(
      'Marking the build success as configured in the task.'
  );
  expect(core.setOutput).toHaveBeenCalledWith('status', 8);
  Object.defineProperty(inputs, 'BLACKDUCKSCA_URL', {value: null})
});
