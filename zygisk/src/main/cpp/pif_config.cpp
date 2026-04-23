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

      static const std::array<std::string_view, 14> kTelephonyKeys = {
          "COUNTRY_ISO", "COUNTRY_CODE", "SIM_OPERATOR_NUMERIC", "SIM_OPERATOR",
          "SIM_OPERATOR_NAME", "SIM_COUNTRY_ISO", "NETWORK_COUNTRY_ISO",
          "NETWORK_OPERATOR_NUMERIC", "OPERATOR_NUMERIC", "OPERATOR_NAME",
          "MCC", "MCC_STRING", "MNC", "MNC_STRING"
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

          if (auto v = take("spoofTelephony"); !v.empty()) config.spoofTelephony = parseBool(v);
          if (auto v = take("hookTelephonyManager"); !v.empty()) config.hookTelephonyManager = parseBool(v);
          if (auto v = take("hookSubscriptionInfo"); !v.empty()) config.hookSubscriptionInfo = parseBool(v);
          if (auto v = take("hookEmergencyNumber"); !v.empty()) config.hookEmergencyNumber = parseBool(v);
          if (auto v = take("hookTelephonyProperties"); !v.empty()) config.hookTelephonyProperties = parseBool(v);
          if (auto v = take("hookSemTelephonyProps"); !v.empty()) config.hookSemTelephonyProps = parseBool(v);
          else if (auto legacy = take("hookSemSystemProperties"); !legacy.empty()) config.hookSemTelephonyProps = parseBool(legacy);
          if (auto v = take("hookULocale"); !v.empty()) config.hookULocale = parseBool(v);
          if (auto v = take("hookCellIdentity"); !v.empty()) config.hookCellIdentity = parseBool(v);
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

          for (const auto& key : kTelephonyKeys) {
              std::string keyStr(key);
              auto it = rawMap.find(keyStr);
              if (it != rawMap.end() && !it->second.empty()) {
                  config.telephonyMap[keyStr] = it->second;
              }
          }
          return config;
      }

      bool writeConfig(int fd, const Config &config) {
          bool ok = writeExact(fd, &config.spoofTelephony, sizeof(config.spoofTelephony));
          ok = ok && writeExact(fd, &config.hookTelephonyManager, sizeof(config.hookTelephonyManager));
          ok = ok && writeExact(fd, &config.hookSubscriptionInfo, sizeof(config.hookSubscriptionInfo));
          ok = ok && writeExact(fd, &config.hookEmergencyNumber, sizeof(config.hookEmergencyNumber));
          ok = ok && writeExact(fd, &config.hookTelephonyProperties, sizeof(config.hookTelephonyProperties));
          ok = ok && writeExact(fd, &config.hookSemTelephonyProps, sizeof(config.hookSemTelephonyProps));
          ok = ok && writeExact(fd, &config.hookULocale, sizeof(config.hookULocale));
          ok = ok && writeExact(fd, &config.hookCellIdentity, sizeof(config.hookCellIdentity));
          ok = ok && writeExact(fd, &config.debug, sizeof(config.debug));

          const uint32_t telephonyCount = (uint32_t)config.telephonyMap.size();
          ok = ok && writeExact(fd, &telephonyCount, sizeof(telephonyCount));
          for (const auto &[k, v] : config.telephonyMap) {
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
          bool ok = readExact(fd, &parsed.spoofTelephony, sizeof(parsed.spoofTelephony));
          ok = ok && readExact(fd, &parsed.hookTelephonyManager, sizeof(parsed.hookTelephonyManager));
          ok = ok && readExact(fd, &parsed.hookSubscriptionInfo, sizeof(parsed.hookSubscriptionInfo));
          ok = ok && readExact(fd, &parsed.hookEmergencyNumber, sizeof(parsed.hookEmergencyNumber));
          ok = ok && readExact(fd, &parsed.hookTelephonyProperties, sizeof(parsed.hookTelephonyProperties));
          ok = ok && readExact(fd, &parsed.hookSemTelephonyProps, sizeof(parsed.hookSemTelephonyProps));
          ok = ok && readExact(fd, &parsed.hookULocale, sizeof(parsed.hookULocale));
          ok = ok && readExact(fd, &parsed.hookCellIdentity, sizeof(parsed.hookCellIdentity));
          ok = ok && readExact(fd, &parsed.debug, sizeof(parsed.debug));

          uint32_t telephonyCount = 0;
          ok = ok && readExact(fd, &telephonyCount, sizeof(telephonyCount));
          for (uint32_t i = 0; ok && i < telephonyCount; ++i) {
              std::string k, v;
              ok = readString(fd, k);
              ok = ok && readString(fd, v);
              if (ok) parsed.telephonyMap.emplace(std::move(k), std::move(v));
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
  