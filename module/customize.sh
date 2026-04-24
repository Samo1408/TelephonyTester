# Don't flash in recovery!
  if ! $BOOTMODE; then
      ui_print "*********************************************************"
      ui_print "! Install from recovery is NOT supported"
      ui_print "! Please install from Magisk / KernelSU / APatch app"
      abort    "*********************************************************"
  fi

  # Error on < Android 8
  if [ "$API" -lt 26 ]; then
      abort "! You can't use this module on Android < 8.0"
  fi

  check_zygisk() {
      local MAGISK_DIR="/data/adb/magisk"
      local ZYGISK_MSG="Zygisk is not enabled. Please either:
      - Enable Zygisk in Magisk settings
      - Install ZygiskNext or ReZygisk module"

      if find /data/adb/modules /data/adb/modules_update -name "libzygisk.so" 2>/dev/null | grep -q .; then
          return 0
      fi

      if [ -d "$MAGISK_DIR" ]; then
          local ZYGISK_STATUS
          ZYGISK_STATUS=$(magisk --sqlite "SELECT value FROM settings WHERE key='zygisk';")
          if [ "$ZYGISK_STATUS" = "value=0" ]; then
              abort "$ZYGISK_MSG"
          fi
      else
          abort "$ZYGISK_MSG"
      fi
  }

  check_zygisk

  # Preserve previous device.conf if installing over old version
  if [ -f "/data/adb/modules/pixeltester/device.conf" ]; then
      ui_print "- Preserving previous device.conf"
      cp -af /data/adb/modules/pixeltester/device.conf "$MODPATH/device.conf"
  fi

  # Make sure config is writable from WebUI
  chmod 0644 "$MODPATH/device.conf"

  ui_print "- Pixel Tester installed."
  ui_print "- Open the WebUI from Magisk / KernelSU / APatch to configure."
  
