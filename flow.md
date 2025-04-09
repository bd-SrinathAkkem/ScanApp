
New-Item -Path 'C:\GitLab-Runner' -ItemType Directory

cd 'C:\GitLab-Runner'

Invoke-WebRequest -Uri "https://gitlab-runner-downloads.s3.amazonaws.com/latest/binaries/gitlab-runner-windows-amd64.exe" -OutFile "gitlab-runner.exe"

.\gitlab-runner.exe register  --url https://gitlab.com  --token glrt-bzoxCnA6MTR5c3RiCnQ6Mwp1OmZ2YTAz7aZS1zca4pgNQif4pXniwhA.1j1hnsozd

.\gitlab-runner.exe install

.\gitlab-runner.exe start
