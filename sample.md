SIGINT- 2849 - Action: Integrate Bridge Package Manager for Non Air Gap

This ticket focuses on enhancing the Bridge CLI to support non-airgap mode for both thin client (thin_client=true) and bundle (thin_client=false) configurations. New workflow version parameters will be introduced for thin clients, and download behavior will be updated to handle custom URLs and BD Repo sources with appropriate precedence.

Requirements

Installation Directory:

Use the default directory for Bridge installation if no custom install location is provided.

Default dir: /Users/<user>/.blackduck/integrations

earlier default path: /Users/<user>/bridge-cli-bundle.

New Parameters:

thin_client=true (default); if set to false, it will be a bundle.

Workflow versions (applicable only for thin client, N/A for bundle):

polaris_workflow_version

coverity_workflow_version

srm_workflow_version

blackducksca_workflow_version

BRIDGE_WORKFLOW_UPDATE_ENABLED:  iIf enabled, disables --update for thin client.

URL validation:

Bridge download URL should be validated to identify whether its bd repo or custom URL.

BD repo : https://repo.blackduck.com

Non-Airgap Mode:

If Bridge is not cached:

Download Bridge from custom URL (if provided) or BD Repo; precedence is given to the custom URL.

If Bridge is cached:

Perform version check; skip download if the same version exists; otherwise, download from custom URL (if provided) or BD Repo, with custom URL taking precedence.

Bridge Changes:

Add versions.txt support for thin client.

Default path change:

Parent directory: .blackduck/integrations

Bundle: .blackduck/integrations/bridge-cli-bundle

Thin Client: .blackduck/integrations/bridge-cli-thin-client

Download and Workflow Logic:

Use the default directory if a custom install location is not provided.

Download Bridge if not found.

If custom download URL is provided:

Download only from the custom URL (takes precedence over BD Repo).

If custom URL is not provided:

Download from BD Repo.

If not error out.

Bridge-CLI version handling:

Download the latest version if no specific version is provided.

Product workflow version:

Use the specified product workflow version if provided by the user (thin client only).

bridge will be taking care of workflow version validation.

Integrate --update for thin client.

./bridge-cli --stage {PRODUCT}@{WORKFLOW_PRODUCT_VERSION} --update

------------------------------------------------------------------------------------------------------------

SIGINT- 2368 - Action: Integrate Bridge Package Manager for Air Gap

Enhance the system to support Bridge installation and download functionality in AirGap mode, ensuring proper handling of custom URLs, workflow versions, and error conditions. The implementation should adhere to the following requirements:

Requirements:  

Installation Directory:  

Use the default directory for Bridge installation if no custom install location is provided.

Default dir: <dot>blackduck/integrations

New Parameters:

thin_client=true (default); if set to false, it will be a bundle.

Workflow versions (applicable only for thin client, N/A for bundle):

polaris_workflow_version

coverity_workflow_version

srm_workflow_version

blackducksca_workflow_version

BRIDGE_WORKFLOW_UPDATE_ENABLED: If enabled disables --update for thin client.

register_url ( applicable on thin client for airgap mode)

URL validation:

Bridge download URL should be validated to identify whether its bd repo or custom URL.

BD repo : https://repo.blackduck.com

THIN_CLIENT_ENABLED

create a new parameter THIN_CLIENT_ENABLED, if its enabled (set by default), if set to false it will be bundle.

THIN_CLIENT enabled: <dot>blackduck/integrations/bridge-cli-thin-client

THIN_CLIENT disabled:  <dot>blackduck/integrations/bridge-cli-bundle

Bridge-CLI Download Logic:  

Check if Bridge-CLI  is present; download it if not found.  

If a custom download URL is provided:  

Download Bridge-CLI exclusively from the specified custom URL.

If no custom URL is provided:  

In AirGap mode: Do not attempt to download Bridge if it’s unavailable. Instead, raise an error and terminate the process.

Version Handling:

If no version is specified, Bridge-CLI should download the latest available version (from the custom URL in AirGap mode) ,if not error out.

Workflow Version Handling(Thin Client):  

If a workflow-specific version is provided by the user, Bridge-CLI should update the product version.

Not supported for Thick Client.

bridge will be taking care of workflow version validation.

Integration shall run --register command → needs discussion.

Integrate --update for thin client.

./bridge-cli --stage {PRODUCT}@{WORKFLOW_PRODUCT_VERSION} --update

Should we call   --update if user provides workflow version on thin client?

—update by default ( air gap / non airgap).

Should we call   --update if user  doesn’t provide workflow version on thin client?

—update by default ( air gap / non airgap).


------------------------------------------------------------------------------------------------------------

Actions/ADO: 

 
Based on thin_client attribute bridge-cli will be called from either bridge-cli-bundle or bridge-cli-thin-client.
bridge-cli-bundle ( is thin_client is disabled)
bridge-cli-thin-client ( is thin_client is enabled)
--update should be enabled by default. if disable_update set then --update is not required.



command = command.concat(BridgeToolsParameter.SPACE).concat(BridgeToolsParameter.INPUT_OPTION).concat(BridgeToolsParameter.SPACE).concat(stateFilePath).concat(BridgeToolsParameter.SPACE).concat('--update').concat(BridgeToolsParameter.SPACE)
When Airgap is enabled, the bridge should utilise the INTRANET URL till registry.json file to register, specifically using BRIDGE_INTRANET_URL.



if(!INTRANET_URL_REGISTERED){
  await sb.executeBridgeCommand('/bridge-cli --register BRIDGE_INTRANET_URL', getGitHubWorkspaceDirV2())
}
Update prepare command to support newer arguments.
Introduce new variable which will append command to support PRODUCT_WORKFLOW_VERSION and append --update.



command = BridgeToolsParameter.STAGE_OPTION.concat(BridgeToolsParameter.SPACE).concat(BridgeToolsParameter.POLARIS_STAGE)
if (inputs.PRODUCT_VERSION) {
  command = command.concat('@').concat(inputs.PRODUCT_WORKFLOW_VERSION)
}
if(inputs.BRIDGECLI_DOWNLOAD_VERSION){
  command = command.concat(' --use ').concat('bridge-cli@BRIDGECLI_DOWNLOAD_VERSION')
}
command = command.concat(BridgeToolsParameter.SPACE).concat(BridgeToolsParameter.INPUT_OPTION).concat(BridgeToolsParameter.SPACE).concat(stateFilePath).concat(BridgeToolsParameter.SPACE).concat('--update').concat(BridgeToolsParameter.SPACE)
return command

Template:
Remove reference to BRIDGECLI_DOWNLOAD_VERSION
Introduce a new variable PRODUCT_VERSION/WORKFLOW_version which will be specific to gitlab-template-executor.

------------------------------------------------------------------------------------------------------------

Modifications 

Variables: 

1. Newer attributes should be introduced in the integrations. 
PRODUCT_VERSION/WORKFLOW_VERSION
BRIDGE_INTRANET_URL(when airgap is enabled.)
We can leverage BRIDGE_INTRANET_URL attribute to register intranet URL 
Before executing any bridge-cli commands, ensure we first register the bridge by running
/bridge-cli --register BRIDGE_INTRANET_URL

Add “—update” to all workflows



./bridge-cli --stage {PRODUCT}@{PRODUCT_VERSION} --update
Remove support forBRIDGECLI_DOWNLOAD_VERSION
Introduce new variable called PRODUCT_VERSION and pass it to bridge-cli. Ignore this during Airgap mode. 
What should be parameter name to accept PRODUCT_VERSION (PRODUCT_VERSION, WORKFLOW_VERSION) 
Validate PRODUCT_VERSION - Future consideration  
Should we restrict user to not to pass multiple products? 
Output:
Non Airgap Mode: 
without version



/Users/s/bridge-cli-bundle/bridge-cli-bundle-macos_arm/bridge-cli --stage polaris 
--input /var/folders/74/c2m7qpj53yq3clsdggrdjdp80000gn/T/blackduck-security-actioniAVTUP/polaris_input.json --update
with version



/Users/s/bridge-cli-bundle/bridge-cli-bundle-macos_arm/bridge-cli --stage polaris@2.20 
--input /var/folders/74/c2m7qpj53yq3clsdggrdjdp80000gn/T/blackduck-security-actioniAVTUP/polaris_input.json --update
Airgap Mode 
with Version: 
/Users/s/bridge-cli-bundle/bridge-cli-bundle-macos_arm/bridge-cli --stage polaris@2.20 
--input /var/folders/74/c2m7qpj53yq3clsdggrdjdp80000gn/T/blackduck-security-actionOVT8vN/polaris_input.json --update 
without version:
/Users/s/bridge-cli-bundle/bridge-cli-bundle-macos_arm/bridge-cli --stage polaris 
--input /var/folders/74/c2m7qpj53yq3clsdggrdjdp80000gn/T/blackduck-security-actionMbDst2/polaris_input.json --update 


Requirements  

New parameters added:
thin_client= true (set by default), if set to false it will be bundle. 
4 product workflow versions:  (applicable for thin client only) if not set latest will be downloaded.  N/A for Bundle
polaris_workflow_version, 
coverity_workflow_version, 
srm_workflow_version, 
blackducksca_workflow_version
register_url ( applicable thin client  for airgap  mode)
disable_update ( applicable thin client  to disable --update)
Scenarios:
TO DO
 
Air Gap:
If bridge is not cached,  User can download bridge only from custom URL. 
If bridge cached, version check will be done , if same version exist downloading part will be skipped if not it will download from custom URL.
Thin Client :  registry.json must be available in similar relative path as thin client as we keep in bd-repo. so that we don't need to ask the custom path from user. (should be documented in guide)
Non Air Gap:
If bridge is not cached,  User can download bridge from custom URL or BD Repo. 
If bridge cached, version check will be done , if same version exist downloading part will be skipped if not it will download from custom URL or BD Repo, precedence will be given to custom URL.
Current contract changes:
network airgap : supports  only custom URL.
Changes needed from bridge
add versions.txt for thin client
Default path change .blackduck/integrations will be the parent directory for bridge install directory.
Bundle : .blackduck/integrations/bridge-cli-bundle
Thin : .blackduck/integrations/bridge-cli-thin-client

Summary:
Use default directory if the custom install location is not provided
Download Bridge if not found.
If custom download url is provided:
Download only from custom url
If custom url not provided:
AirGap: Do not download if bridge is not available. Error out in this case.
Workflow version:
Bridge shall download latest if no version is provided
Bridge shall download workflow specific version if user provided one.
For air gap - bridge should use the custom url - for workflow downloads:
Integration shall run --register command. 
--register should be used anytime you want to use a root registry other than the default public one.
When testing, and using our internal artifactory root registry instead of the public one, or
Users in airgap mode that have their own root registry hosted internally.( registry file should be present)
If you are using the default public registry, you do not need to call this.
After discussing with
We should  introduce a new parameter from Integrations that allows users to disable the --update functionality if they prefer. Since --update will be enabled by default for the thin client, this option might give users more flexibility.
Additionally:
If a user specifies a workflow version on the thin client.
-- update will be called by default for both air gap and non air gap mode. 
For situations where the user doesn’t provide a workflow version, should we still enable --update by default?
-- update will be called by default for both air gap and non air gap mode.   


