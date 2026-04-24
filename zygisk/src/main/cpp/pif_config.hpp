#pragma once

  #include <string>
  #include <string_view>
  #include <unordered_map>
  #include <unordered_set>

  namespace pif {
      struct Config {
          // Device and build properties for Pixel spoofing
          std::unordered_map<std::string, std::string> deviceMap;

          bool spoofDevice = true;

          // Property hook toggles
          bool hookBuildProperties   = true; // ro.build.* and ro.product.* properties
          bool hookSystemProperties  = true; // ro.system.* properties
          bool hookVendorProperties  = true; // ro.vendor.* properties
          bool hookOdmProperties     = true; // ro.odm.* properties
          bool hookProductProperties = true; // ro.product.* properties
          bool hookDebugProperties   = true; // ro.debuggable and related

          // Identity / network spoof toggles (Java-side hooks)
          bool hookSerial       = false;
          bool hookAndroidId    = false;
          bool hookGsfId        = false;
          bool hookDrmId        = false;
          bool hookImei         = false;
          bool hookWifiMac      = false;
          bool hookWifiInfo     = false;
          bool hookCarrier      = false;
          bool hookPhoneNumber  = false;

          std::unordered_set<std::string> allowedApps;
          bool debug = false;

          [[nodiscard]] bool needsDex() const {
              return spoofDevice;
          }
          [[nodiscard]] bool needsPropertyHook() const {
              return spoofDevice && (hookBuildProperties || hookSystemProperties 
                  || hookVendorProperties || hookOdmProperties || hookProductProperties || hookDebugProperties);
          }
          [[nodiscard]] bool isAllowed(const std::string& pkg) const {
              return allowedApps.find(pkg) != allowedApps.end();
          }
      };

      [[nodiscard]] Config parseConfig(std::string_view content);
      [[nodiscard]] bool writeConfig(int fd, const Config &config);
      [[nodiscard]] bool readConfig(int fd, Config &config);
  }
  
