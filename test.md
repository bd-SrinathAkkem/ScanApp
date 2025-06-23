

Error: Workflow failed! Requires at least one scan type:  (polaris_server_url,coverity_url,blackducksca_url,srm_url)

It was noted that this is misleading, A “scan type” is NOT a URL, therefore it is a bug and the message needs to change.

Analysis:

I was able to reproduce with the following;

name: CI-BlackDuck-SCA-Basic
on:
  push:
    branches: [ main, master, develop, stage, release ]
  pull_request:
    branches: [ main, master, develop, stage, release ]
  workflow_dispatch:
    
jobs:
  build:
    runs-on: [ X64 ]
    steps:
      - name: Checkout Source
        uses: actions/checkout@v3
      - name: Black Duck Scan
        uses: blackduck-inc/black-duck-security-scan@v2.1.1
        
        ### Configure DETECT environment variables
        env:
          DETECT_PROJECT_NAME: ${{ github.event.repository.name }}
          DETECT_PROJECT_VERSION_NAME: main
          BLACKDUCK_TRUST_CERT: true
          
        with:
          ### SCANNING: Required fields
          ##blackducksca_url: ${{ vars.BLACKDUCKSCA_URL }}
          blackducksca_token: ${{ secrets.BLACKDUCKSCA_TOKEN }}
          #detect_args: '--detect.tools=SIGNATURE_SCAN'
         
          #### SCANNING: Optional fields
          # blackducksca_scan_failure_severities: 'BLOCKER,CRITICAL'
          
          ### FIX PULL REQUEST CREATION: Uncomment below to enable
          # blackducksca_fixpr_enabled: true
          github_token: ${{ secrets.GITHUB_TOKEN }} # Required when Fix PRs is enabled



result:


Expectation:
It was noted the expectation is the error 

“Error: Workflow failed! Requires at least one scan type:”

Instead of scan type it should be changed to specify that it requires a URL
