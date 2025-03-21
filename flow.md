Start

if AirgapModeEnabled
    if ClientTypeThin
        if BridgeCached
            if BridgeDownloadURL or BridgeDownloadVersion
                if VersionDiffers
                    Download Bridge
                else
                    Skip Download
            else
                Skip Download
        else
            if BridgeDownloadURL
                Download Bridge (Use Version if Provided)
            else
                Error: Cannot Download Bridge in Airgap Mode
    else  // Thick Client (Airgap)
        if BridgeCached
            Skip Download
        else
            if BridgeDownloadURL
                Download Bridge (Use Version if Provided)
            else
                Download Latest Bridge
else  // Non-Airgap Mode
    if ClientTypeThin
        if BridgeCached
            if BridgeDownloadURL or BridgeDownloadVersion
                if VersionDiffers
                    Download Bridge
                else
                    Skip Download
            else
                Skip Download
        else
            if BridgeDownloadURL
                Download Bridge (Use Version if Provided)
            else
                if BridgeDownloadVersion
                    Download Specified Version
                else
                    Download Latest Bridge
    else  // Thick Client (Non-Airgap)
        if BridgeCached
            Skip Download
        else
            if BridgeDownloadURL
                Download Bridge (Use Version if Provided)
            else
                Download Latest Bridge

if ClientTypeThin and WorkflowVersion
    Apply Workflow Version

End
