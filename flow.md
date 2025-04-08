Overview

Document Version: 1.1
Date: April 03, 2025
Prepared for: Development Team

Problem Statement

The Bridge class supports Windows (win64), Linux (linux64), and macOS (macosx, macos_arm) but lacks Linux ARM support (e.g., arm, arm64), limiting its use on ARM-based systems prevalent in modern CI/CD pipelines. This analysis addresses:

OS Type Detection: How to identify Linux ARM across GitHub, GitLab, Jenkins, Bitbucket, and ADO.

Integration Changes: Updates to Bridge class logic (download, paths, execution) for Linux ARM.

SCM Compatibility: Ensuring detection and integration work in each SCM’s runtime (e.g., GitHub Actions, GitLab CI, Jenkins jobs).

Spike Objectives:

Identify all scenarios requiring OS type detection.

Determine accurate OS detection methods for each SCM action.

The focus spans GitHub Actions, GitLab, Jenkins, Bitbucket, and ADO, ensuring a comprehensive solution.

System Architecture

Key Components

Download: Selects linux_arm vs. linux64 in URLs.

Path Construction: Appends platform to paths (e.g., bridge-cli-bundle-linux_arm).

Executable Setup: Differentiates Windows (.exe) from Linux/macOS; no ARM-specific change.

Execution: Relies on correct path; no direct OS check needed.

Logical Flow

OS Detection

Using os module to detect platform and architecture.

Determine if the system is running ARM using CPU and architecture checks.

Bridge Download & Path Handling

Identify the correct Bridge binary for the detected OS.

Construct appropriate download paths and execution paths.

Execution & Integration

Ensure correct execution flow based on SCM environments (GitHub Actions, GitLab CI, etc.).

High Level Design

Proposed Solution

OS Type and Architecture Identification

Bash Implementation:

# Detect OS type and architecture
os_type=$(uname -s)
arch_type=$(uname -m)

Typescript:

const osName = process.platform
const isARM = !os.cpus()[0].model.includes('Intel')

Rationale:

!os.cpus()[0].model.includes('Intel'): Infers ARM by absence of Intel branding, aligning with macOS ARM logic.

os.arch(): Confirms ARM architecture (aarch/arm, aarch64/arm64)

process.platform: Ensures Linux context.

Java:

For identification purpose, need to adjust the following files accordingly inside the blakcduck-security-scan-plugin project-

ApplicationConstants.java - add constants for linux_arm and its support for minimum compatible bridge version

BridgeDownloadParametersService.java - modify public boolean isVersionCompatibleForARMChips(String version, String minCompatibleBridgeVersion) and public String getPlatform(String version) methods to add conditions for checking linux_arm and minimum bridge version compatibility based on the OS and architecture

BridgeDownloadParameterServiceTest.java - adjust the test methods to sync with the linux_armadjustments made in the implementation

Python

# Detect OS type and architecture
import platform
os_name = platform.system().lower()
arch = platform.machine().lower()

Integration Updates

Modify the Bridge class to recognize linux_arm as a platform, impacting download URLs, path construction, and execution.

Implementation:

Update Bridge class with OS and Architecture Detection.

Define LINUX_ARM_PLATFORM and MIN_SUPPORTED_BRIDGE_CLI_LINUX_ARM_VERSION.

Testing:

Test on Linux ARM (e.g., Ubuntu ARM64) and Intel systems across all SCMs.

Validate Bash/PowerShell in GitLab, freestyle/pipeline in Jenkins.

Documentation:

Document Artifactory requirements for linux_arm.

Update SCM integration guides.

Monitoring:

Log OS detection in downloadBridge() for diagnostics.

SCM Support and Integration



Linux ARM Support Status



Implementation

Status

Artifacts

GitHub Actions







GitLab Template







Azure Pipeline







Jenkins







Bitbucket Pipe







GitHub Actions

Integration Points in Bridge Class

Bridge Download

Methods: getVersionUrl(), getLatestVersionUrl(), downloadBridge().

Change: Support linux_arm in URL patterns.

Design:

getVersionUrl(version: string): string {
  const osName = process.platform
  const isARM = !os.cpus()[0].model.includes('Intel')
  let platform = ''

  if (osName === MAC_PLATFORM_NAME) {
    platform = isARM && 
               semver.gte(version, constants.MIN_SUPPORTED_BRIDGE_CLI_MAC_ARM_VERSION) ? 
                        this.MAC_ARM_PLATFORM : this.MAC_PLATFORM
  } else if (osName === LINUX_PLATFORM_NAME) {
    platform = isARM ? this.LINUX_ARM_PLATFORM : this.LINUX_PLATFORM
  } else if (osName === WINDOWS_PLATFORM_NAME) {
    platform = this.WINDOWS_PLATFORM
  }

  return this.bridgeUrlPattern.replace(/\$version/g, version).replace('$platform', platform)
}

 async downloadBridge(tempDir: string): Promise<void> {
    try {
      # ... (rest-unchanged)
      if (inputs.BRIDGE_CLI_DOWNLOAD_URL) {
          # ... (rest-unchanged)
          if (!bridgeVersion) {
            const regex = /\w*(bridge-cli-bundle-(win64|linux64|linux_arm|macosx|macos_arm).zip)/
            bridgeVersion = await this.getBridgeVersionFromLatestURL(bridgeUrl.replace(regex, 'versions.txt'))
          }
        }
      }
    }
    # ... (rest-unchanged)
  }

Path Parameters

Methods: getBridgeDefaultPath(), getBridgeCLIDownloadDefaultPath().

Change: Use getOSPlatform() to append linux_arm (e.g., ~/bridge-cli-bundle-linux_arm).

Design:

getOSPlatform(): string {
  const osName = process.platform
  const isARM = !os.cpus()[0].model.includes('Intel')

  if (osName === MAC_PLATFORM_NAME) {
    return isARM ? this.MAC_ARM_PLATFORM : this.MAC_PLATFORM
  } else if (osName === LINUX_PLATFORM_NAME) {
    return isARM ? this.LINUX_ARM_PLATFORM : this.LINUX_PLATFORM
  } else if (osName === WINDOWS_PLATFORM_NAME) {
    return this.WINDOWS_PLATFORM
  }
  return ''
}

Execution Logic

Method: setBridgeExecutablePath().

Change: No update needed; Linux ARM uses /bridge-cli like linux64.

Design:

private async setBridgeExecutablePath(): Promise<void> {
  if (process.platform === WINDOWS_PLATFORM_NAME) {
    this.bridgeExecutablePath = await tryGetExecutablePath(this.bridgePath.concat('\\bridge-cli'), ['.exe'])
  } else if (process.platform === MAC_PLATFORM_NAME || process.platform === LINUX_PLATFORM_NAME) {
    this.bridgeExecutablePath = await tryGetExecutablePath(this.bridgePath.concat('/bridge-cli'), [])
  }
}

Other Scenarios

checkIfBridgeExists(): Uses / for Linux ARM; no change needed.

executeBridgeCommand(): OS-agnostic post-path setup; no change required.

GitLab Template

Integration Points in templates/security_scan.yml 

.run-black-duck-tools :
    # ... (rest-unchanged)
    script : |
        # ... (rest-unchanged)
        echo "Starting black-duck-security-scan execution.."
        echo "$OSTYPE platform"
        # ... (rest-unchanged)
        OSTYPE=$(echo "$OSTYPE" | tr '[:upper:]' '[:lower:]')
        bridgeDefaultPath="${HOME}/${bridgeDefaultDirectory}"
        arch="$(uname -m)"
        min_arm_supported_version="2.1.0"
        min_linux_arm_supported_version="2.1.0"
        
        if [[ "$OSTYPE" == *"linux"* ]]; then
          if [[ $DOWNLOAD_BRIDGE_VERSION != "" && "$(printf '%s\n' "$DOWNLOAD_BRIDGE_VERSION" "$min_linux_arm_supported_version" | sort -V | head -n1)" != "$min_arm_supported_version" ]]; then
            platform="linux64"
          elif [[ "$arch" = x86_64* && "$(uname -a)" = "*ARM64*" ]] || [[ "$arch" = arm* || "$arch" = aarch64 ]]; then
            platform="linux_arm"
          else
            platform="linux64"
          fi
        elif [[ "$OSTYPE" == *"darwin"* ]]; then
          if [[ $DOWNLOAD_BRIDGE_VERSION != "" && "$(printf '%s\n' "$DOWNLOAD_BRIDGE_VERSION" "$min_arm_supported_version" | sort -V | head -n1)" != "$min_arm_supported_version" ]]; then
            platform="macosx"
          elif [[ "$arch" = x86_64* && "$(uname -a)" = "*ARM64*" ]] || [[ "$arch" = arm* || "$arch" = aarch64 ]]; then
            platform="macos_arm"
          else
            platform="macosx"
          fi
        fi
        
        # ... (rest-unchanged)
          if [[ $bridgeCliVersion == '' ]]; then
            retry_template "${latest_version_error_message}" "$(echo "$bridgeDownloadUrl" | sed 's/bridge-cli-bundle-[macos_arm|macosx|linux64|linux_arm]*.zip*/versions.txt/g')" "latest-versions.txt"
            # ... (rest-unchanged)
          fi
        fi
        # ... (rest-unchanged)

Azure DevOps (ADO)

Integration Points in Bridge Class

Bridge Download

Methods: getVersionUrl(), getLatestVersionUrl(), getBridgeCliUrl().

Change: Support linux_arm in URL patterns.

Design:

getVersionUrl(version: string): string {
  const osName = process.platform;
  let bridgeDownloadUrl = this.bridgeCliUrlPattern.replace(/\$version/g, version);

  const getOsSuffix = (isValidVersion: boolean, intelSuffix: string, armSuffix: string): string => {
    if (!isValidVersion) return intelSuffix;
    const isIntel = os.cpus()[0].model.includes("Intel");
    return isIntel ? intelSuffix : armSuffix;
  };

  if (osName === constants.DARWIN) {
    const isValidVersionForARM = semver.gte(version, constants.MIN_SUPPORTED_BRIDGE_CLI_MAC_ARM_VERSION);
    const osSuffix = getOsSuffix(isValidVersionForARM, constants.MAC_INTEL_PLATFORM, constants.MAC_ARM_PLATFORM);
    bridgeDownloadUrl = bridgeDownloadUrl.replace("$platform", osSuffix);
  } else if (osName === constants.LINUX) {
    const isValidVersionForARM = semver.gte(version, constants.MIN_SUPPORTED_BRIDGE_CLI_LINUX_ARM_VERSION);
    const osSuffix = getOsSuffix(isValidVersionForARM, constants.LINUX_PLATFORM, constants.LINUX_ARM_PLATFORM);
    bridgeDownloadUrl = bridgeDownloadUrl.replace("$platform", osSuffix);
  } else if (osName === constants.WIN32) {
    bridgeDownloadUrl = bridgeDownloadUrl.replace("$platform", constants.WINDOWS_PLATFORM);
  }

  return bridgeDownloadUrl;
}

 async getBridgeCliUrl(): Promise<string | undefined> {
    # ... (rest-unchanged)
      const versionsArray = bridgeUrl.match(".*bridge-cli-bundle-([0-9.]*).*");
      if (versionsArray) {
        version = versionsArray[1];
        if (!version) {
          const regex =
            /\w*(bridge-cli-bundle-(win64|linux64|linux_arm|macosx|macos_arm).zip)/;
    # ... (rest-unchanged)
  }

Path Parameters

Methods: getDefaultBridgeCliPath(), getDefaultBridgeCliSubDirectory().

Change: Use getLinuxOsSuffix() to append linux_arm (e.g., ~/bridge-cli-bundle-linux_arm).

Design:

getDefaultBridgeCliSubDirectory(): string {
  const osName = process.platform;

  if (osName === constants.DARWIN || osName === constants.LINUX) {
    const osPlatform = osName === constants.DARWIN 
      ? this.getMacOsSuffix() 
      : this.getLinuxOsSuffix();
    return `${constants.BRIDGE_CLI_DEFAULT_SUBDIRECTORY_PATH_UNIX}-${osPlatform}`;
  }

  if (osName === constants.WIN32) {
    return `${constants.BRIDGE_CLI_DEFAULT_SUBDIRECTORY_PATH_WINDOWS}-${constants.WINDOWS_PLATFORM}`;
  }

  taskLib.debug("bridgeSubDirectory: Unknown OS");
  return "";
}

getMacOsSuffix(): string {
  const isIntel = os.cpus()[0].model.includes("Intel");
  return isIntel ? constants.MAC_INTEL_PLATFORM : constants.MAC_ARM_PLATFORM;
}

getLinuxOsSuffix(): string {
  const isIntel = os.cpus()[0].model.includes("Intel");
  return isIntel ? constants.LINUX_PLATFORM : constants.LINUX_ARM_PLATFORM;
}

Execution Logic

Method: setBridgeCliExecutablePath().

Change: No update needed; Linux ARM uses /bridge-cli like linux64.

Design:

async setBridgeCliExecutablePath(filePath: string): Promise<string> {
    if (process.platform === constants.WIN32) {
      this.bridgeCliExecutablePath = path.join(
        filePath,
        constants.BRIDGE_CLI_EXECUTABLE_WINDOWS
      );
    } else if (
      process.platform === constants.DARWIN ||
      process.platform === constants.LINUX
    ) {
      this.bridgeCliExecutablePath = path.join(
        filePath,
        constants.BRIDGE_CLI_EXECUTABLE_MAC_LINUX
      );
    }
    return this.bridgeCliExecutablePath;
}

Jenkins

Implementation changes

For identification purpose, need to adjust the following files accordingly inside the blakcduck-security-scan-plugin project-

ApplicationConstants.java - inside this file need to add the following constants-

public static final String PLATFORM_LINUX_ARM = "linux-arm";
public static final String LINUX_ARM_COMPATIBLE_BRIDGE_VERSION = "2.5.0";

BridgeDownloadParametersService.java - inside this file make adjustments to the following methods public boolean isVersionCompatibleForARMChips(String version, String minCompatibleBridgeVersion) and public String getPlatform(String version) accordingly -

public boolean isVersionCompatibleForARMChips(String version, String  - here check for ARM chip version compatibility with the processed version and the minimum supported version. This method is refactored from its previous version public boolean isVersionCompatibleForMacARM(String version) to be made generic instead of its current implementation which only supports mac_arm checking.

public boolean isVersionCompatibleForARMChips(String version, String minCompatibleBridgeVersion) {
        if (version.equals(ApplicationConstants.BRIDGE_CLI_LATEST_VERSION)) {
            return true;
        }
        String[] inputVersionSplits = version.split("\\.");
        String[] minCompatibleArmVersionSplits = minCompatibleBridgeVersion.split("\\.");
        if (inputVersionSplits.length != 3 && minCompatibleArmVersionSplits.length != 3) {
            return false;
        }
        Version inputVersion = new Version(
                Integer.parseInt(inputVersionSplits[0]),
                Integer.parseInt(inputVersionSplits[1]),
                Integer.parseInt(inputVersionSplits[2]),
                null,
                null,
                null);
        Version minCompatibleArmVersion = new Version(
                Integer.parseInt(minCompatibleArmVersionSplits[0]),
                Integer.parseInt(minCompatibleArmVersionSplits[1]),
                Integer.parseInt(minCompatibleArmVersionSplits[2]),
                null,
                null,
                null);

        return inputVersion.compareTo(minCompatibleArmVersion) >= 0;
    }

public String getPlatform(String version) - modify this method to check for linux_arm support by extracting the OS and architecture information

public String getPlatform(String version) {
        String os = Utility.getAgentOs(workspace, listener);
        if (os.contains("win")) {
            return ApplicationConstants.PLATFORM_WINDOWS;
        } else if (os.contains("mac")) {
            String arch = Utility.getAgentOsArch(workspace, listener);
            if (version != null && !isVersionCompatibleForARMChips(version, ApplicationConstants.MAC_ARM_COMPATIBLE_BRIDGE_VERSION)) {
                return ApplicationConstants.PLATFORM_MACOSX;
            } else {
                if (arch.startsWith("arm") || arch.startsWith("aarch")) {
                    return ApplicationConstants.PLATFORM_MAC_ARM;
                } else {
                    return ApplicationConstants.PLATFORM_MACOSX;
                }
            }
        } else if (os.contains("linux")) {
            String arch = Utility.getAgentOsArch(workspace, listener);
            if (version != null && !isVersionCompatibleForARMChips(version, ApplicationConstants.LINUX_ARM_COMPATIBLE_BRIDGE_VERSION)) {
                return ApplicationConstants.PLATFORM_LINUX;
            } else {
                if (arch.startsWith("arm") || arch.startsWith("aarch")) {
                    return ApplicationConstants.PLATFORM_LINUX_ARM;
                } else {
                    return ApplicationConstants.PLATFORM_LINUX;
                }
            }
        } else {
            return ApplicationConstants.PLATFORM_LINUX;
        }
    }

Test cases

BridgeDownloadParameterServiceTest.java - here, need to adjust the following test methods void getPlatformTest(), void isVersionCompatibleForMacARMTest() and add the new test void isVersionCompatibleForLinuxARMTest()

void getPlatformTest() - add test support for linux_arm conditions

@Test
void getPlatformTest() {
    String osName = System.getProperty("os.name").toLowerCase();
    String osArch = System.getProperty("os.arch").toLowerCase();
    String platform = bridgeDownloadParametersService.getPlatform(null);
    assertNotNull(platform);
    if (osName.contains("win")) {
      assertEquals(ApplicationConstants.PLATFORM_WINDOWS, platform);
    } else if (osName.contains("mac")) {
        if (osArch.startsWith("arm") || osArch.startsWith("aarch")) {
          assertEquals(ApplicationConstants.PLATFORM_MAC_ARM, platform);
      } else {
          assertEquals(ApplicationConstants.PLATFORM_MACOSX, platform);
      }
    } else if (osName.contains("linux")) {
      if (osArch.startsWith("arm") || osArch.startsWith("aarch")) {
          assertEquals(ApplicationConstants.PLATFORM_LINUX_ARM, platform);
      } else {
          assertEquals(ApplicationConstants.PLATFORM_LINUX, platform);
      }
    } else {
    assertEquals(ApplicationConstants.PLATFORM_LINUX, platform);
}

}

void isVersionCompatibleForMacARMTest() - adjust the test method to keep in sync with the modified bridgeDownloadParametersService.isVersionCompatibleForARMChips(String version, String minCompatibleBridgeVersion) method.

@Test
public void isVersionCompatibleForMacARMTest() {
    assertTrue(bridgeDownloadParametersService.isVersionCompatibleForARMChips("2.1.0", ApplicationConstants.MAC_ARM_COMPATIBLE_BRIDGE_VERSION));
    assertTrue(bridgeDownloadParametersService.isVersionCompatibleForARMChips("2.2.38", ApplicationConstants.MAC_ARM_COMPATIBLE_BRIDGE_VERSION));
    assertFalse(bridgeDownloadParametersService.isVersionCompatibleForARMChips("2.0.0", ApplicationConstants.MAC_ARM_COMPATIBLE_BRIDGE_VERSION));
    assertFalse(bridgeDownloadParametersService.isVersionCompatibleForARMChips("1.2.12", ApplicationConstants.MAC_ARM_COMPATIBLE_BRIDGE_VERSION));
}

void isVersionCompatibleForLinuxARMTest() - new test method added for checking linux_arm minimum bridge version compatibility.

@Test
public void isVersionCompatibleForLinuxARMTest() {
    assertTrue(bridgeDownloadParametersService.isVersionCompatibleForARMChips("2.5.0", ApplicationConstants.LINUX_ARM_COMPATIBLE_BRIDGE_VERSION));
    assertTrue(bridgeDownloadParametersService.isVersionCompatibleForARMChips("2.5.38", ApplicationConstants.LINUX_ARM_COMPATIBLE_BRIDGE_VERSION));
    assertFalse(bridgeDownloadParametersService.isVersionCompatibleForARMChips("2.0.0", ApplicationConstants.LINUX_ARM_COMPATIBLE_BRIDGE_VERSION));
    assertFalse(bridgeDownloadParametersService.isVersionCompatibleForARMChips("1.2.12", ApplicationConstants.LINUX_ARM_COMPATIBLE_BRIDGE_VERSION));
}

Bitbucket Pipe

Update the project blackduck-security-scan by modifying the file pipe.py

Make the following changes to get_bridge_cli_url function to accommodate linux_arm compatibility check

import platform

# ... rest unchanged
# add the following constants
ARM_ARTIFACTORY_BRIDGE_URL = "https://repo.blackduck.com/bds-integrations-release/com/blackduck/integration/bridge/binaries/bridge-cli-bundle/latest/bridge-cli-bundle-linux64_arm.zip"
ARM_COMPATIBLE_BRIDGE_VERSION = "2.5.0"

# ... rest unchanged
# modify the following function
def get_bridge_cli_url(self):
        arch = platform.machine().lower()
        artifactory_url = ARM_ARTIFACTORY_BRIDGE_URL if (arch.startswith('arm') or arch.startswith(
            'aarch')) else ARTIFACTORY_BRIDGE_URL

        if self.bridgecli_download_url:
            logger.info("User provided Bridge CLI download URL")
            artifactory_url = self.bridgecli_download_url

        elif self.bridgecli_download_version:
            version = self.bridgecli_download_version
            logger.info(f"User provided Bridge CLI version: {version}")

            if arch.startswith('arm') or arch.startswith('aarch'):
                if version < ARM_COMPATIBLE_BRIDGE_VERSION:
                    logger.error("ARM architecture detected, using ARM incompatible Bridge CLI version")
                    exit(1)
                logger.info("ARM architecture detected, using ARM compatible Bridge CLI version")
                artifactory_url = f"{ARTIFACTORY_BASE_URL}/{version}/{BRIDGE_CLI_INSTALLATION_DIRECTORY_NAME}-{version}-linux64_arm.zip"
            else:
                artifactory_url = f"{ARTIFACTORY_BASE_URL}/{version}/{BRIDGE_CLI_INSTALLATION_DIRECTORY_NAME}-{version}-linux64.zip"

        return artifactory_url

# ... rest unchanged


Testing Strategy

Test Case

Scenario

Expected Result

OS Detection

Run script on ARM/Linux

Detects linux_arm

Bridge Download

Fetch correct binary

Downloads bridge-linux_arm

SCM Integration

Run on various CI Platforms.

Executes without error

Path Resolution

Verify execution path

Uses correct platform path

Risks and Mitigations

Risk

Impact

Mitigation

Non-Intel, non-ARM CPUs (e.g., AMD)

Misidentification as ARM

Use os.arch() fallback to confirm ARM.

Missing linux_arm bundles

Download failure (404)

Ensure Artifactory contains linux_arm builds; downloadBridge() error handling.

Older versions lack ARM support

Runtime errors on ARM

 MIN_SUPPORTED_BRIDGE_CLI_LINUX_ARM_VERSION with semver.gte()

SCM runner variability

Inconsistent detection

Ensure OS detection done properly.

Conclusion

This analysis confirms that adding Linux ARM support to the Bridge class is feasible using OS detection commands, ensuring compatibility across GitHub, GitLab, Jenkins, Bitbucket, and ADO. The solution requires minimal changes, leverages built-in system functions for accurate detection, and supports diverse SCM environments.

Approval

 Approved for Implementation

 Requires Further Review

References

Black Duck Bridge CLI Documentation: https://documentation.blackduck.com/bundle/bridge/page/documentation/c_using-github-action.html 

Related Docs:

https://unix.stackexchange.com/questions/582513/best-way-to-detect-architecture-for-all-linux 

https://www.hivelocity.net/kb/check-linux-version/ 
