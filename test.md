@Raj

cc: @Tias @Manj @Chakra @Madhu

Summary of SARIF Report Behavior and Findings:

Attached are the logs named SwaggerSarif_log.txt, along with my findings outlined below.

The SARIF report is being generated; however, it appears to be empty. According to the logs, this issue may stem from a combination of missing detectors, network problems, or component mapping issues. The scan was executed in the following directory:

/opt/streamline/actions-runner/_work/dev-lfs/dev-lfs/swagger

While the scan initiates successfully, it seems that the intelligent scan data required for the SARIF output could not be retrieved or linked.

Key Errors Observed

Detector-Related Errors

ERROR: One or more required detector types were not found: NPM

INFO: No detectors found.  
These messages indicate that the necessary detectors were not triggered. It’s unclear whether the project utilizes NPM or another package manager, so it would be prudent to verify if the scan path contains the appropriate project files (e.g., package.json, pom.xml, etc.).

Network and Certificate Warnings

WARNING: Ignoring extra certs from '/etc/ssl/certs/ca-bundle.crt'

NODE_TLS_REJECT_UNAUTHORIZED is set to '0'

ERROR: Connection reset while accessing https://repo.blackduck.com  
These errors may suggest intermittent connectivity issues or misconfigured certificates, which could hinder metadata downloads, detector resolution, or SARIF processing.

Component Mapping and SARIF Output Failures

WARNING: Failed to get location details from Detect Component Locator: no available components

INFO: No Intelligent scan data found which is required for SARIF report creation  
This indicates that the SARIF generator executed but could not associate any components with file locations, likely due to prior detection or network failures.

Suggested Resolutions for the Customer

Ensure that the scan path includes the necessary project files for detection (e.g., package.json, etc.). If a specific detector type is being enforced via --detect.required.detector.types, consider removing it to allow for automatic detection.

Confirm that the environment has stable access to https://repo.blackduck.com. Review proxy, firewall, or DNS configurations as needed. Additionally, disabling TLS verification (NODE_TLS_REJECT_UNAUTHORIZED=0) is not advisable in production environments.

Once the above issues are addressed, rerunning the scan may allow the intelligent scan data to populate correctly and reflect in the SARIF report.

@Raj Could you please check with the customer if the suggested resolutions yielded the desired outcome? In the meantime, we will work on identifying the exact root cause.

This is my current analysis based on the logs. @Chakra – could you please advise if there’s anything else we should explore to help identify the root cause? Thank you!
