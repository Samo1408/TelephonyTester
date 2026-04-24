#include "pif_config.hpp"

  #include <array>
  #include <cstdint>
  #include <unistd.h>
  #include <vector>

  namespace pif {
      namespace {
          ssize_t xread(int fd, void *buffer, size_t count) {
              ssize_t total = 0; char *buf = (char*)buffer; size_t rem = count;
              while (rem > 0) {
                  ssize_t r = TEMP_FAILURE_RETRY(read(fd, buf, rem));
                  if (r < 0) return -1;
                  if (r == 0) break;
                  buf += r; total += r; rem -= r;
              }
              return total;
          }
          ssize_t xwrite(int fd, const void *buffer, size_t count) {
              ssize_t total = 0; const char *buf = (const char*)buffer; size_t rem = count;
              while (rem > 0) {
                  ssize_t r = TEMP_FAILURE_RETRY(write(fd, buf, rem));
                  if (r < 0) return -1;
                  if (r == 0) break;
                  buf += r; total += r; rem -= r;
              }
              return total;
          }
          bool readExact(int fd, void *buf, size_t s) { return xread(fd, buf, s) == (ssize_t)s; }
          bool writeExact(int fd, const void *buf, size_t s) { return xwrite(fd, buf, s) == (ssize_t)s; }

          std::string trim(std::string_view value) {
              const auto start = value.find_first_not_of(" \t\r\n");
              if (start == std::string_view::npos) return {};
              const auto end = value.find_last_not_of(" \t\r\n");
              return std::string(value.substr(start, end - start + 1));
          }

          bool parseBool(std::string_view value) {
              return value == "1" || value == "true" || value == "TRUE" || value == "True";
          }

          bool writeVector(int fd, const std::vector<uint8_t> &buffer) {
              const uint32_t size = (uint32_t)buffer.size();
              if (!writeExact(fd, &size, sizeof(size))) return false;
              return size == 0 || writeExact(fd, buffer.data(), size);
          }
          bool readVector(int fd, std::vector<uint8_t> &buffer) {
              uint32_t size = 0;
              if (!readExact(fd, &size, sizeof(size))) return false;
              buffer.resize(size);
              return size == 0 || readExact(fd, buffer.data(), size);
          }
          bool writeString(int fd, const std::string &v) {
              const std::vector<uint8_t> b(v.begin(), v.end());
              return writeVector(fd, b);
          }
          bool readString(int fd, std::string &v) {
              std::vector<uint8_t> b;
              if (!readVector(fd, b)) return false;
              v.assign(b.begin(), b.end());
              return true;
          }
      }

      static const std::array<std::string_view, 44> kDeviceKeys = {
          // Build and device properties
          "brand", "manufacturer", "model", "productName", "deviceCode", "board", "hardware",
          "boardPlatform", "buildFingerprint", "buildId", "buildDisplayId", "buildIncremental",
          "buildRelease", "buildSdk", "securityPatch", "buildDescription", "buildFlavor",
          "buildProduct", "buildCharacteristics", "screenWidth", "screenHeight", "screenDensity",
          "socModel", "socManufacturer", "bootloader", "baseband", "name", "code",
          // Identity & network spoofing values (consumed by DeviceHooker.java)
          "serialNumber", "androidId", "gsfId", "drmId",
          "imei", "meid", "phoneNumber",
          "simOperator", "networkOperator", "carrierName", "simOperatorName",
          "simCountryIso", "networkCountryIso",
          "wifiMac", "wifiSsid", "wifiBssid"
      };

      Config parseConfig(std::string_view content) {
          Config config;
          std::unordered_map<std::string, std::string> rawMap;

          size_t lineStart = 0;
          while (lineStart <= content.size()) {
              const auto lineEnd = content.find('\n', lineStart);
              const auto rawLine = content.substr(lineStart,
                  lineEnd == std::string_view::npos ? content.size() - lineStart : lineEnd - lineStart);

              auto line = rawLine;
              if (const auto comment = line.find('#'); comment != std::string_view::npos) {
                  line = line.substr(0, comment);
              }
              const auto trimmed = trim(line);
              if (!trimmed.empty()) {
                  const auto eq = trimmed.find('=');
                  if (eq != std::string::npos) {
                      rawMap.emplace(trim(trimmed.substr(0, eq)), trim(trimmed.substr(eq + 1)));
                  }
              }
              if (lineEnd == std::string_view::npos) break;
              lineStart = lineEnd + 1;
          }

          auto take = [&](const char* k) -> std::string {
              auto it = rawMap.find(k);
              if (it == rawMap.end()) return {};
              std::string v = it->second;
              rawMap.erase(it);
              return v;
          };

          if (auto v = take("spoofDevice"); !v.empty()) config.spoofDevice = parseBool(v);
          if (auto v = take("hookBuildProperties"); !v.empty()) config.hookBuildProperties = parseBool(v);
          if (auto v = take("hookSystemProperties"); !v.empty()) config.hookSystemProperties = parseBool(v);
          if (auto v = take("hookVendorProperties"); !v.empty()) config.hookVendorProperties = parseBool(v);
          if (auto v = take("hookOdmProperties"); !v.empty()) config.hookOdmProperties = parseBool(v);
          if (auto v = take("hookProductProperties"); !v.empty()) config.hookProductProperties = parseBool(v);
          if (auto v = take("hookDebugProperties"); !v.empty()) config.hookDebugProperties = parseBool(v);
          if (auto v = take("hookSerial");       !v.empty()) config.hookSerial       = parseBool(v);
          if (auto v = take("hookAndroidId");    !v.empty()) config.hookAndroidId    = parseBool(v);
          if (auto v = take("hookGsfId");        !v.empty()) config.hookGsfId        = parseBool(v);
          if (auto v = take("hookDrmId");        !v.empty()) config.hookDrmId        = parseBool(v);
          if (auto v = take("hookImei");         !v.empty()) config.hookImei         = parseBool(v);
          if (auto v = take("hookWifiMac");      !v.empty()) config.hookWifiMac      = parseBool(v);
          if (auto v = take("hookWifiInfo");     !v.empty()) config.hookWifiInfo     = parseBool(v);
          if (auto v = take("hookCarrier");      !v.empty()) config.hookCarrier      = parseBool(v);
          if (auto v = take("hookPhoneNumber");  !v.empty()) config.hookPhoneNumber  = parseBool(v);
          if (auto v = take("DEBUG"); !v.empty()) config.debug = parseBool(v);

          if (auto v = take("allowedApps"); !v.empty()) {
              // comma- or whitespace-separated list
              size_t start = 0;
              while (start < v.size()) {
                  size_t end = v.find_first_of(", \t\r\n;:", start);
                  if (end == std::string::npos) end = v.size();
                  std::string pkg = trim(std::string_view(v).substr(start, end - start));
                  if (!pkg.empty()) config.allowedApps.insert(pkg);
                  start = end + 1;
              }
          }

          for (const auto& key : kDeviceKeys) {
              std::string keyStr(key);
              auto it = rawMap.find(keyStr);
              if (it != rawMap.end() && !it->second.empty()) {
                  config.deviceMap[keyStr] = it->second;
              }
          }
          return config;
      }

      bool writeConfig(int fd, const Config &config) {
          bool ok = writeExact(fd, &config.spoofDevice, sizeof(config.spoofDevice));
          ok = ok && writeExact(fd, &config.hookBuildProperties, sizeof(config.hookBuildProperties));
          ok = ok && writeExact(fd, &config.hookSystemProperties, sizeof(config.hookSystemProperties));
          ok = ok && writeExact(fd, &config.hookVendorProperties, sizeof(config.hookVendorProperties));
          ok = ok && writeExact(fd, &config.hookOdmProperties, sizeof(config.hookOdmProperties));
          ok = ok && writeExact(fd, &config.hookProductProperties, sizeof(config.hookProductProperties));
          ok = ok && writeExact(fd, &config.hookDebugProperties, sizeof(config.hookDebugProperties));
          ok = ok && writeExact(fd, &config.hookSerial,       sizeof(config.hookSerial));
          ok = ok && writeExact(fd, &config.hookAndroidId,    sizeof(config.hookAndroidId));
          ok = ok && writeExact(fd, &config.hookGsfId,        sizeof(config.hookGsfId));
          ok = ok && writeExact(fd, &config.hookDrmId,        sizeof(config.hookDrmId));
          ok = ok && writeExact(fd, &config.hookImei,         sizeof(config.hookImei));
          ok = ok && writeExact(fd, &config.hookWifiMac,      sizeof(config.hookWifiMac));
          ok = ok && writeExact(fd, &config.hookWifiInfo,     sizeof(config.hookWifiInfo));
          ok = ok && writeExact(fd, &config.hookCarrier,      sizeof(config.hookCarrier));
          ok = ok && writeExact(fd, &config.hookPhoneNumber,  sizeof(config.hookPhoneNumber));
          ok = ok && writeExact(fd, &config.debug, sizeof(config.debug));

          const uint32_t deviceCount = (uint32_t)config.deviceMap.size();
          ok = ok && writeExact(fd, &deviceCount, sizeof(deviceCount));
          for (const auto &[k, v] : config.deviceMap) {
              ok = ok && writeString(fd, k);
              ok = ok && writeString(fd, v);
          }

          const uint32_t appsCount = (uint32_t)config.allowedApps.size();
          ok = ok && writeExact(fd, &appsCount, sizeof(appsCount));
          for (const auto &pkg : config.allowedApps) {
              ok = ok && writeString(fd, pkg);
          }
          return ok;
      }

      bool readConfig(int fd, Config &config) {
          Config parsed;
          bool ok = readExact(fd, &parsed.spoofDevice, sizeof(parsed.spoofDevice));
          ok = ok && readExact(fd, &parsed.hookBuildProperties, sizeof(parsed.hookBuildProperties));
          ok = ok && readExact(fd, &parsed.hookSystemProperties, sizeof(parsed.hookSystemProperties));
          ok = ok && readExact(fd, &parsed.hookVendorProperties, sizeof(parsed.hookVendorProperties));
          ok = ok && readExact(fd, &parsed.hookOdmProperties, sizeof(parsed.hookOdmProperties));
          ok = ok && readExact(fd, &parsed.hookProductProperties, sizeof(parsed.hookProductProperties));
          ok = ok && readExact(fd, &parsed.hookDebugProperties, sizeof(parsed.hookDebugProperties));
          ok = ok && readExact(fd, &parsed.hookSerial,       sizeof(parsed.hookSerial));
          ok = ok && readExact(fd, &parsed.hookAndroidId,    sizeof(parsed.hookAndroidId));
          ok = ok && readExact(fd, &parsed.hookGsfId,        sizeof(parsed.hookGsfId));
          ok = ok && readExact(fd, &parsed.hookDrmId,        sizeof(parsed.hookDrmId));
          ok = ok && readExact(fd, &parsed.hookImei,         sizeof(parsed.hookImei));
          ok = ok && readExact(fd, &parsed.hookWifiMac,      sizeof(parsed.hookWifiMac));
          ok = ok && readExact(fd, &parsed.hookWifiInfo,     sizeof(parsed.hookWifiInfo));
          ok = ok && readExact(fd, &parsed.hookCarrier,      sizeof(parsed.hookCarrier));
          ok = ok && readExact(fd, &parsed.hookPhoneNumber,  sizeof(parsed.hookPhoneNumber));
          ok = ok && readExact(fd, &parsed.debug, sizeof(parsed.debug));

          uint32_t deviceCount = 0;
          ok = ok && readExact(fd, &deviceCount, sizeof(deviceCount));
          for (uint32_t i = 0; ok && i < deviceCount; ++i) {
              std::string k, v;
              ok = readString(fd, k);
              ok = ok && readString(fd, v);
              if (ok) parsed.deviceMap.emplace(std::move(k), std::move(v));
          }

          uint32_t appsCount = 0;
          ok = ok && readExact(fd, &appsCount, sizeof(appsCount));
          for (uint32_t i = 0; ok && i < appsCount; ++i) {
              std::string pkg;
              ok = readString(fd, pkg);
              if (ok) parsed.allowedApps.insert(std::move(pkg));
          }

          if (!ok) return false;
          config = std::move(parsed);
          return true;
      }
  }
  
