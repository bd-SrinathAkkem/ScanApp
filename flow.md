
 

2025-04-01 13:34:35.2942 EDT [Blackduck SCA SARIF Issues Fetcher] WARNING: Failed to get location details from Detect Component Locator: no available components<br>2025-04-01 13:34:35.2967 EDT [Blackduck SCA SARIF Issues Fetcher] INFO: No Intelligent scan data found which is required for SARIF report creation<br> 
 seems there were no available components
 SARIF issue fetcher will consider direct & transitive dependencies
  

2025-04-01 13:34:35.2624 EDT [Blackduck SCA SARIF Issues Fetcher] INFO: Components data with filter "bomMatchType:file_dependency_direct" retrieved successfully<br>2025-04-01 13:34:35.2871 EDT [Blackduck SCA SARIF Issues Fetcher] INFO: Components data with filter "bomMatchType:file_dependency_transitive" retrieved successfully
 there are other type of matches ex: Exact Directory & etc.., SARIF issues fetcher do not consider them
 if we have access to https://blackduck-staging.eng.netapp.com
 we could check it in HUB UI
 or atleast if we have a access token, we can check through APIs
oh its their internal site, we cannot access it from here
we could tell them that if they go to their project in Hub, & select Match Type filter & check Direct Dependency & Transitive Dependency, with that filter, I think there will be no components that have security risk, hence SARIF report is empty in their case
 or they could call this APIs -
  
curl --location 'https://blackduck-staging.eng.netapp.com/api/projects/9a9465a4-88a6-4a9a-8c5c-b45029d19af4/versions/7d52ab4e-089e-4c5c-8f16-5521ef9084de/components?filter=bomMatchType%3Afile_dependency_direct' \<br>--header 'Authorization: Bearer <token>'
  

curl --location 'https://blackduck-staging.eng.netapp.com/api/projects/9a9465a4-88a6-4a9a-8c5c-b45029d19af4/versions/7d52ab4e-089e-4c5c-8f16-5521ef9084de/components?filter=bomMatchType%3Afile_dependency_transitive' \<br>--header 'Authorization: Bearer <token>'
 the response may or may not be empty, SARIF issues depend on if there are vulnerabilities associated with those components if there are any from those APIs (also depends on blackducksca.reports.sarif.severities if configured)
 
