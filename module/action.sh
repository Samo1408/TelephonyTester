#!/system/bin/sh
MODDIR="/data/adb/modules/pixeltester"

if [ -z "$MMRL" ] && [ -n "$MAGISKTMP" ]; then
    if pm path io.github.a13e300.ksuwebui >/dev/null 2>&1; then
        echo "- Launching WebUI in KSUWebUIStandalone..."
        am start -n "io.github.a13e300.ksuwebui/.WebUIActivity" -e id "pixeltester"
        exit 0
    fi
    if pm path com.dergoogler.mmrl.wx >/dev/null 2>&1; then
        echo "- Launching WebUI in WebUI X..."
        am start -n "com.dergoogler.mmrl.wx/.ui.activity.webui.WebUIActivity" -e MOD_ID "pixeltester"
        exit 0
    fi
fi
echo "Open WebUI from Magisk / KernelSU / APatch manager."
