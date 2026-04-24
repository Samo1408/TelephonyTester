#!/system/bin/sh
# Pixel Tester install script

if ! $BOOTMODE; then
    ui_print "*********************************************************"
    ui_print "! Install from recovery is NOT supported"
    ui_print "! Please install from Magisk / KernelSU / APatch app"
    abort    "*********************************************************"
fi

if [ "$API" -lt 26 ]; then
    abort "! This module requires Android 8.0 (API 26) or higher"
fi

check_zygisk() {
    local MAGISK_DIR="/data/adb/magisk"
    local ZYGISK_MSG="! Zygisk is not enabled. Either:
    - Enable Zygisk in Magisk settings, or
    - Install ZygiskNext / ReZygisk module"

    if find /data/adb/modules /data/adb/modules_update -name "libzygisk.so" 2>/dev/null | grep -q .; then
        return 0
    fi
    if [ -d "$MAGISK_DIR" ]; then
        local ZS
        ZS=$(magisk --sqlite "SELECT value FROM settings WHERE key='zygisk';" 2>/dev/null)
        [ "$ZS" = "value=0" ] && abort "$ZYGISK_MSG"
    else
        abort "$ZYGISK_MSG"
    fi
}
check_zygisk

# Preserve previous device.conf
OLD_CONF="/data/adb/modules/pixeltester/device.conf"
if [ -f "$OLD_CONF" ]; then
    ui_print "- Preserving existing device.conf"
    cp -af "$OLD_CONF" "$MODPATH/device.conf"
fi

# Preserve user override at /data/adb/pixeltester.conf
[ -f /data/adb/pixeltester.conf ] && ui_print "- Existing /data/adb/pixeltester.conf will be used"

# Permissions
chmod 0644 "$MODPATH/device.conf" 2>/dev/null
chmod 0755 "$MODPATH/action.sh"   2>/dev/null
[ -d "$MODPATH/webroot" ] && chmod -R 0644 "$MODPATH/webroot" && find "$MODPATH/webroot" -type d -exec chmod 0755 {} \;

ui_print "- Pixel Tester installed"
ui_print "- Open WebUI from your root manager (Magisk / KernelSU / APatch)"
ui_print "- After enabling, REBOOT and pick a Pixel preset, then Save."
