| Thin Client vs Bundle Client | Bridge Download URL | Bridge Download Version | polaris_workflow_version, coverity_workflow_version, srm_workflow_version, blackducksca_workflow_version | bridgecli_install_directory | is Bridge Cached ?  | Action Behaviour  NON  AIRGAP ( Uses custom URL and BD  URL to download Bridge CLI ) | AIR GAP MODE ENABLED ( Uses only custom URL to download Bridge CLI) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Thin Client | Not Provided | Not Provided | Not Provided | Not Provided | no |  the latest bridge-cli will be downloaded | If bridge is not cached, Bridge `will not` be downloaded, should error out in this case.  downloaded. |
|   | Not Provided | Provided | Not Provided | Provided | no |  the provided version of the Bridge will be downloaded in user provided directory. | It wil use the cached bridge if not error out. |
|   | Not Provided | Not Provided | Provided | Not Provided | no |  latest bridge will be downloaded  will use workflow version. | Bridge `will not` be downloaded, should error out in this case. |
|   | Not Provided | Provided | Provided | Provided | no | provided version of  bridge will be downloaded in the BID path  will use workflow version. | provided version of  bridge will be downloaded in the BID path  will use workflow version. |
|   | Provided | Not Provided | Not Provided | Not Provided | no | Bridge CLI gets downloaded  into default directory | Bridge CLI gets downloaded  into default directory |
|   | Provided | Provided | Not Provided | Provided | no | Bridge CLI gets downloadedin BID | Bridge CLI gets downloadedin BID |
|   | Provided | Not Provided | Provided | Not Provided | no | Bridge CLI gets downloaded either into default directory and use worklow version | Bridge CLI gets downloaded either into default directory and use worklow version |
|   | Provided | Provided | Provided | Provided | no | Bridge CLI gets downloaded  and use worklow version ( URL takes precedence over version) | Bridge CLI gets downloaded  and use worklow version ( URL takes precedence over version) |
|   | Not Provided | Not Provided | Not Provided | Not Provided | yes | download will be skipped. | download will be skipped. |
|   | Not Provided | Provided | Not Provided | Provided | yes | download will be skipped if same version exist if not it downloads bridge   | download will be skipped if same version exist if not it downloads bridge   |
|   | Not Provided | Not Provided | Provided | Not Provided | yes | download will be skipped and used workflow version. | download will be skipped and used workflow version. |
|   | Not Provided | Provided | Provided | Provided | yes | download will be skipped if same version exist if not it downloads bridge and used workflow version. | download will be skipped if same version exist if not it downloads bridge  and used workflow version. |
|   | Provided | Not Provided | Not Provided | Not Provided | yes | download will be skipped if same version exist if not it downloads bridge   | download will be skipped if same version exist if not it downloads bridge   |
|   | Provided | Provided | Not Provided | Provided | yes | download will be skipped if same version exist if not it downloads bridge   | download will be skipped if same version exist if not it downloads bridge   |
|   | Provided | Not Provided | Provided | Not Provided | yes | download will be skipped if same version exist if not it downloads bridge and uses workflow | download will be skipped if same version exist if not it downloads bridge  and uses workflow |
|   | Provided | Provided | Provided | Provided | yes | download will be skipped if same version exist if not it downloads bridge and uses workflow | download will be skipped if same version exist if not it downloads bridge  and uses workflow |
|   |   |   |   |   |   |   |   |
| Thick Client | Not Provided | Not Provided | NA | Not Provided | no |  the latest Bridge will be downloaded |  the latest Bridge will be downloaded. |
|   | Not Provided | Provided | NA | Provided | no |  the provided version of the Bridge will be downloaded |  the provided version of the Bridge will be downloaded |
|   | Provided | Not Provided | NA | Not Provided | no | Bridge CLI gets downloaded  into default directory | Bridge CLI gets downloaded  into default directory |
|   | Provided | Provided | NA | Provided | no | Bridge CLI gets downloadedin BID | Bridge CLI gets downloadedin BID |
|   | Not Provided | Not Provided | NA | Not Provided | yes | download will be skipped. | download will be skipped. |
|   | Not Provided | Provided | NA | Provided | yes | download will be skipped if same version exist if not it downloads bridge   | download will be skipped if same version exist if not it downloads bridge   |
|   | Provided | Not Provided | NA | Not Provided | yes | download will be skipped if same version exist if not it downloads bridge   | download will be skipped if same version exist if not it downloads bridge   |
|   | Provided | Provided | NA | Provided | yes | download will be skipped if same version exist if not it downloads bridge   | download will be skipped if same version exist if not it downloads bridge   |
