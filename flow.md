Data/Uploading SARIF report to GitHub Advanced Security failed - SIGINT 2769

Issue : SARIF Report works correctly for GitHub cloud / saas but fails for GitHub Enterprise. Data issue and Upload Error for SARIF Report using Blackduck security action

Priority : Critical (Reported by Customer)
- They implemented and tested this solution in their testing with github saas and moved to production with github enterprise and that’s where they hit this issue

Error from logs:
Fetching GitHub client service instance...
GitHub Enterprise Server version 3.14.1 is not supported, proceeding with default version 3.12
Uploading SARIF results to GitHub
Error: Workflow failed! Uploading SARIF report to GitHub Advanced Security failed: Error: Cookies must be enabled to use GitHub


TEAMS Channel Thread: Carmelo Caisip: GitHub action, SARIF file upload error

Solution: 

Before :
 this.githubApiURL = this.githubServerUrl === constants.GITHUB_CLOUD_URL ? constants.GITHUB_CLOUD_API_URL : this.githubServerUrl;

After:
this.githubApiURL = process.env[constants.GITHUB_ENVIRONMENT_VARIABLES.GITHUB_API_URL] || '';

Before:
const data = {
                        commit_sha: this.commit_sha,
                        ref: this.githubRef,
                        sarif: base64Sarif,
                        validate: true
                    };


After:
const data = this.createSarifData(base64Sarif);

private createSarifData(base64Sarif: string): SarifData {
    const data: SarifData = {
      commit_sha: this.commit_sha,
      ref: this.githubRef,
      sarif: base64Sarif
    }
    if (this.githubApiURL === constants.GITHUB_CLOUD_API_URL) {
      data.validate = true
    }
    return data
  }

export interface SarifData {
  commit_sha: string
  ref: string
  sarif: string
  validate?: boolean
}

SIGINT - 2887 - GitHub Action: Test SARIF on GHE 3.15

We got security license for GHE 3.15 version. So as part of this ticket we nee to verify:

SARIF upload.

make sure UI filters and date shown on advance security is in sync with GH cloud all features of code scanning working as expected.

Regression test for Fix PR, PR comment are working as expected

Log msg “ GitHub Enterprise Server version 3.15.4 is not supported, proceeding with default version 3.12” may not make sense:

should we add 3.15 as supported version as we have Indra to verify? this depends on below points if we know what is the contract changes between 3.12 or 3.15

if not we need to modify the message accordingly.

Check if any contract diff between 3.12 and 3.15 based on all incremental release notes , REST API docs for these version, runner version etc.

Need to check with Raj if we should start officially claiming version support for 3.15.


POLDOCS
GitHub Action: GitHub advance security for GHE server
Update prod documentation for  GitHub advance security SARIF upload support for GHE server:

GitHub Action supports SARIF upload to Github Advance security dashboard for GitHub Enterprise Server. Our changes has been verified on Enterprise server 3.15 version.

Prerequisites for uplaoding SARIF to Github Advance security dashboard for GitHub Enterprise Server are:

@Srinath Akkem  to add details













