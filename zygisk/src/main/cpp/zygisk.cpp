#include "zygisk.hpp"
  #include "Dobby/include/dobby.h"
  #include "pif_config.hpp"

  #include <android/log.h>
  #include <jni.h>
  #include <string>
  #include <string_view>
  #include <sys/socket.h>
  #include <sys/system_properties.h>
  #include <sys/time.h>
  #include <unistd.h>
  #include <fcntl.h>
  #include <vector>
  #include <cstdio>
  #include <cstring>

  #define LOGD(...) __android_log_print(ANDROID_LOG_DEBUG, "TeleInject", __VA_ARGS__)
  #define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, "TeleInject", __VA_ARGS__)

  #define DEX_PATH      "/data/adb/modules/teleinject/classes.dex"
  #define MODULE_PROP   "/data/adb/modules/teleinject/module.prop"
  #define CONFIG_PATH   "/data/adb/modules/teleinject/telephony.conf"
  #define CUSTOM_CONFIG "/data/adb/teleinject.conf"

  namespace {

  constexpr uint8_t COMMAND_LOAD_PAYLOAD = 1;
  constexpr int PAYLOAD_TIMEOUT_MS = 5000;

  JNIEnv *gEnv = nullptr;
  pif::Config gConfig;
  std::vector<uint8_t> gDexBytes;

  using T_Callback = void (*)(void *, const char *, const char *, uint32_t);

  T_Callback o_callback = nullptr;
  void (*o_system_property_read_callback)(prop_info *, T_Callback, void *) = nullptr;
  using T_SystemPropertyGet = int (*)(const char *, char *);
  T_SystemPropertyGet o_system_property_get = nullptr;

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

  void applySocketTimeout(int fd) {
      const timeval timeout{
              .tv_sec = PAYLOAD_TIMEOUT_MS / 1000,
              .tv_usec = (suseconds_t)((PAYLOAD_TIMEOUT_MS % 1000) * 1000),
      };
      setsockopt(fd, SOL_SOCKET, SO_RCVTIMEO, &timeout, sizeof(timeout));
      setsockopt(fd, SOL_SOCKET, SO_SNDTIMEO, &timeout, sizeof(timeout));
  }

  bool readFileBytes(const char *p, std::vector<uint8_t> &out) {
      out.clear();
      int fd = open(p, O_RDONLY | O_CLOEXEC);
      if (fd < 0) return false;
      std::vector<uint8_t> buf(4096);
      ssize_t n = 0;
      while ((n = TEMP_FAILURE_RETRY(read(fd, buf.data(), buf.size()))) > 0) {
          out.insert(out.end(), buf.begin(), buf.begin() + n);
      }
      close(fd);
      return n == 0 && !out.empty();
  }

  bool loadConfigBytes(std::vector<uint8_t> &out) {
      if (readFileBytes(CUSTOM_CONFIG, out)) return true;
      return readFileBytes(CONFIG_PATH, out);
  }

  bool writeVector(int fd, const std::vector<uint8_t> &b) {
      const uint32_t s = (uint32_t)b.size();
      if (!writeExact(fd, &s, sizeof(s))) return false;
      return s == 0 || writeExact(fd, b.data(), s);
  }
  bool readVector(int fd, std::vector<uint8_t> &b) {
      uint32_t s = 0;
      if (!readExact(fd, &s, sizeof(s))) return false;
      b.resize(s);
      return s == 0 || readExact(fd, b.data(), s);
  }

  std::string jsonEscape(const std::string &value) {
      std::string out;
      out.reserve(value.size() + 8);
      for (char c : value) {
          switch (c) {
              case '\\': out += "\\\\"; break;
              case '"': out += "\\\""; break;
              case '\n': out += "\\n"; break;
              case '\r': out += "\\r"; break;
              case '\t': out += "\\t"; break;
              default: out += c; break;
          }
      }
      return out;
  }

  std::string telephonyMapToJson() {
      std::string j = "{";
      bool first = true;
      for (const auto &[k, v] : gConfig.telephonyMap) {
          if (!first) j += ",";
          first = false;
          j += "\"" + jsonEscape(k) + "\":\"" + jsonEscape(v) + "\"";
      }
      j += "}";
      return j;
  }

  std::string flagsToJson() {
      auto b = [](bool x){ return x ? "true" : "false"; };
      std::string j = "{";
      j += std::string("\"hookTelephonyManager\":") + b(gConfig.hookTelephonyManager) + ",";
      j += std::string("\"hookSubscriptionInfo\":") + b(gConfig.hookSubscriptionInfo) + ",";
      j += std::string("\"hookEmergencyNumber\":") + b(gConfig.hookEmergencyNumber) + ",";
      j += std::string("\"hookULocale\":") + b(gConfig.hookULocale) + ",";
      j += std::string("\"hookCellIdentity\":") + b(gConfig.hookCellIdentity);
      j += "}";
      return j;
  }

  // Map our config keys to the system property names that
  // android.telephony.TelephonyProperties / SemSystemProperties read from.
  struct PropMap { const char* prop; const char* configKeys[4]; };
  static const PropMap kPropMappings[] = {
      // ===== android.sysprop.TelephonyProperties =====
      // operator_* (current registered network)
      {"gsm.operator.numeric",           {"NETWORK_OPERATOR_NUMERIC", "OPERATOR_NUMERIC", nullptr, nullptr}},
      {"gsm.operator.iso-country",       {"NETWORK_COUNTRY_ISO", "COUNTRY_ISO", nullptr, nullptr}},
      {"gsm.operator.alpha",             {"OPERATOR_NAME", nullptr, nullptr, nullptr}},
      // icc_operator_* (SIM operator)
      {"gsm.sim.operator.numeric",       {"SIM_OPERATOR_NUMERIC", "SIM_OPERATOR", "OPERATOR_NUMERIC", nullptr}},
      {"gsm.sim.operator.iso-country",   {"SIM_COUNTRY_ISO", "COUNTRY_ISO", nullptr, nullptr}},
      {"gsm.sim.operator.alpha",         {"SIM_OPERATOR_NAME", "OPERATOR_NAME", nullptr, nullptr}},

      // ===== com.samsung.telephony.sysprop.SemTelephonyProps =====
      // Samsung uses "ril." prefixed system properties for the same values.
      {"ril.operator.numeric",           {"NETWORK_OPERATOR_NUMERIC", "OPERATOR_NUMERIC", nullptr, nullptr}},
      {"ril.operator.iso-country",       {"NETWORK_COUNTRY_ISO", "COUNTRY_ISO", nullptr, nullptr}},
      {"ril.operator.alpha",             {"OPERATOR_NAME", nullptr, nullptr, nullptr}},
      {"ril.sim.operator.numeric",       {"SIM_OPERATOR_NUMERIC", "SIM_OPERATOR", "OPERATOR_NUMERIC", nullptr}},
      {"ril.sim.operator.iso-country",   {"SIM_COUNTRY_ISO", "COUNTRY_ISO", nullptr, nullptr}},
      {"ril.sim.operator.alpha",         {"SIM_OPERATOR_NAME", "OPERATOR_NAME", nullptr, nullptr}},
      {"ril.icc_operator_numeric",       {"SIM_OPERATOR_NUMERIC", "SIM_OPERATOR", "OPERATOR_NUMERIC", nullptr}},
      {"ril.icc_operator_iso_country",   {"SIM_COUNTRY_ISO", "COUNTRY_ISO", nullptr, nullptr}},
      {"ril.icc_operator_alpha",         {"SIM_OPERATOR_NAME", "OPERATOR_NAME", nullptr, nullptr}},
      // Samsung CSC
      {"ro.csc.country_code",            {"COUNTRY_CODE", nullptr, nullptr, nullptr}},
      {"ro.csc.countryiso_code",         {"COUNTRY_ISO", "NETWORK_COUNTRY_ISO", "SIM_COUNTRY_ISO", nullptr}},
      {"ro.csc.sales_code",              {"OPERATOR_NAME", "SIM_OPERATOR_NAME", nullptr, nullptr}},
      {"ro.boot.csc_sales_code",         {"OPERATOR_NAME", "SIM_OPERATOR_NAME", nullptr, nullptr}},
  };

  static const char* lookupSpoofValue(const std::string_view& propName) {
      if (!gConfig.spoofTelephony) return nullptr;
      bool sem = (propName.find("ril.") == 0 || propName.find("ro.csc") == 0
                  || propName.find("ro.boot.csc") == 0);
      if (sem && !gConfig.hookSemTelephonyProps) return nullptr;
      if (!sem && !gConfig.hookTelephonyProperties) return nullptr;

      for (const auto& m : kPropMappings) {
          if (propName != m.prop) continue;
          for (const char* key : m.configKeys) {
              if (!key) continue;
              auto it = gConfig.telephonyMap.find(key);
              if (it != gConfig.telephonyMap.end() && !it->second.empty()) {
                  return it->second.c_str();
              }
          }
      }
      return nullptr;
  }

  void modifyCallback(void *cookie, const char *name, const char *value, uint32_t serial) {
      if (!cookie || !name || !value || !o_callback) return;

      const char *oldValue = value;
      const std::string_view prop(name);
      if (const char* spoof = lookupSpoofValue(prop); spoof) {
          value = spoof;
      }

      if (gConfig.debug && strcmp(oldValue, value) != 0) {
          LOGD("[%s]: %s -> %s", name, oldValue, value);
      }
      o_callback(cookie, name, value, serial);
  }

  void systemPropertyReadCallback(prop_info *pi, T_Callback callback, void *cookie) {
      if (!pi || !callback || !o_system_property_read_callback) {
          if (o_system_property_read_callback) o_system_property_read_callback(pi, callback, cookie);
          return;
      }
      o_callback = callback;
      o_system_property_read_callback(pi, modifyCallback, cookie);
  }

  int systemPropertyGet(const char *name, char *value) {
      if (name && value) {
          if (const char* spoof = lookupSpoofValue(std::string_view(name)); spoof) {
              snprintf(value, PROP_VALUE_MAX, "%s", spoof);
              if (gConfig.debug) LOGD("[%s]: -> %s", name, value);
              return (int)strlen(value);
          }
      }
      return o_system_property_get ? o_system_property_get(name, value) : 0;
  }

  bool doHookProperty() {
      bool hooked = false;
      void *readPtr = DobbySymbolResolver(nullptr, "__system_property_read_callback");
      if (readPtr && DobbyHook(readPtr, (void*)systemPropertyReadCallback,
                           (void**)&o_system_property_read_callback) == 0) {
          LOGD("hooked __system_property_read_callback at %p", readPtr);
          hooked = true;
      } else {
          LOGE("hook __system_property_read_callback failed");
      }

      void *getPtr = DobbySymbolResolver(nullptr, "__system_property_get");
      if (getPtr && DobbyHook(getPtr, (void*)systemPropertyGet,
                           (void**)&o_system_property_get) == 0) {
          LOGD("hooked __system_property_get at %p", getPtr);
          hooked = true;
      } else {
          LOGE("hook __system_property_get failed");
      }
      return hooked;
  }

  void injectDex() {
      if (gDexBytes.empty()) {
          LOGD("[INJECT] no dex payload available");
          return;
      }

      jclass classLoaderClass = gEnv->FindClass("java/lang/ClassLoader");
      jmethodID getSystemClassLoader = gEnv->GetStaticMethodID(
              classLoaderClass, "getSystemClassLoader", "()Ljava/lang/ClassLoader;");
      jobject systemClassLoader = gEnv->CallStaticObjectMethod(classLoaderClass, getSystemClassLoader);
      if (gEnv->ExceptionCheck()) { gEnv->ExceptionClear(); return; }

      jobject dexBuffer = gEnv->NewDirectByteBuffer(gDexBytes.data(), (jlong)gDexBytes.size());
      jclass inMem = gEnv->FindClass("dalvik/system/InMemoryDexClassLoader");
      jmethodID inMemInit = gEnv->GetMethodID(
              inMem, "<init>", "(Ljava/nio/ByteBuffer;Ljava/lang/ClassLoader;)V");
      jobject loader = gEnv->NewObject(inMem, inMemInit, dexBuffer, systemClassLoader);
      if (gEnv->ExceptionCheck()) { gEnv->ExceptionClear(); return; }

      jmethodID loadClass = gEnv->GetMethodID(
              classLoaderClass, "loadClass", "(Ljava/lang/String;)Ljava/lang/Class;");
      jstring entryClassName = gEnv->NewStringUTF("es.chiteroman.playintegrityfix.EntryPoint");
      jobject entryClassObject = gEnv->CallObjectMethod(loader, loadClass, entryClassName);
      if (gEnv->ExceptionCheck()) { gEnv->ExceptionClear(); return; }

      jclass entryPointClass = (jclass)entryClassObject;
      // signature: init(String telephonyJson, String flagsJson)
      jmethodID entryInit = gEnv->GetStaticMethodID(entryPointClass, "init",
          "(Ljava/lang/String;Ljava/lang/String;)V");
      const std::string telephonyJson = telephonyMapToJson();
      const std::string flagsJson = flagsToJson();
      jstring jt = gEnv->NewStringUTF(telephonyJson.c_str());
      jstring jf = gEnv->NewStringUTF(flagsJson.c_str());
      gEnv->CallStaticVoidMethod(entryPointClass, entryInit, jt, jf);
      if (gEnv->ExceptionCheck()) {
          gEnv->ExceptionDescribe();
          gEnv->ExceptionClear();
      }
      gEnv->DeleteLocalRef(jt);
      gEnv->DeleteLocalRef(jf);
      gEnv->DeleteLocalRef(entryClassObject);
      gEnv->DeleteLocalRef(entryClassName);
      gEnv->DeleteLocalRef(loader);
      gEnv->DeleteLocalRef(inMem);
      gEnv->DeleteLocalRef(dexBuffer);
      gEnv->DeleteLocalRef(systemClassLoader);
      gEnv->DeleteLocalRef(classLoaderClass);
  }

  bool requestPayload(int fd) {
      if (fd < 0) return false;
      applySocketTimeout(fd);
      bool ok = writeExact(fd, &COMMAND_LOAD_PAYLOAD, sizeof(COMMAND_LOAD_PAYLOAD));
      bool companionOk = false;
      ok = ok && readExact(fd, &companionOk, sizeof(companionOk));
      if (!ok || !companionOk) { close(fd); return false; }

      ok = readConfig(fd, gConfig);
      if (ok && gConfig.needsDex()) {
          ok = readVector(fd, gDexBytes);
      } else {
          gDexBytes.clear();
      }
      close(fd);
      if (!ok) { gDexBytes.clear(); gConfig = {}; return false; }
      return true;
  }

  void companion(int fd) {
      applySocketTimeout(fd);
      uint8_t command = 0;
      bool ok = readExact(fd, &command, sizeof(command)) && command == COMMAND_LOAD_PAYLOAD;

      std::vector<uint8_t> cfgBytes;
      std::vector<uint8_t> dexBytes;
      pif::Config config;

      if (ok) ok = loadConfigBytes(cfgBytes);
      if (ok) {
          const std::string_view view((const char*)cfgBytes.data(), cfgBytes.size());
          config = pif::parseConfig(view);
      }
      if (ok && config.needsDex()) ok = readFileBytes(DEX_PATH, dexBytes);

      writeExact(fd, &ok, sizeof(ok));
      if (!ok) return;

      ok = writeConfig(fd, config);
      if (ok && config.needsDex()) ok = writeVector(fd, dexBytes);
      if (!ok) LOGE("[COMPANION] failed to send payload");
  }

  }

  using namespace zygisk;

  class TeleInjectModule : public ModuleBase {
  public:
      void onLoad(Api *api_, JNIEnv *env_) override {
          api = api_;
          env = env_;
      }

      void preAppSpecialize(AppSpecializeArgs *args) override {
          payloadLoaded = false;
          appAllowed = false;
          gConfig = {};
          gDexBytes.clear();

          if (!args) {
              api->setOption(DLCLOSE_MODULE_LIBRARY);
              return;
          }

          std::string name;
          const char *raw = env->GetStringUTFChars(args->nice_name, nullptr);
          if (raw) {
              name = raw;
              env->ReleaseStringUTFChars(args->nice_name, raw);
          }
          if (name.empty()) {
              api->setOption(DLCLOSE_MODULE_LIBRARY);
              return;
          }

          // Load config to know which apps are allowed.
          payloadLoaded = requestPayload(api->connectCompanion());
          if (!payloadLoaded || !gConfig.spoofTelephony) {
              api->setOption(DLCLOSE_MODULE_LIBRARY);
              payloadLoaded = false;
              return;
          }

          // Allow exact match, or "*" wildcard meaning every app.
          appAllowed = gConfig.isAllowed(name) || gConfig.isAllowed("*");
          if (!appAllowed) {
              api->setOption(DLCLOSE_MODULE_LIBRARY);
              return;
          }

          api->setOption(FORCE_DENYLIST_UNMOUNT);
          currentPackage = name;
      }

      void postAppSpecialize(const AppSpecializeArgs *args) override {
          if (!payloadLoaded || !appAllowed) return;
          gEnv = env;

          if (gConfig.debug) {
              LOGD("[APP] hooking %s", currentPackage.c_str());
          }

          if (gConfig.needsPropertyHook()) {
              doHookProperty();
          }
          if (gConfig.needsDex()) {
              injectDex();
          }
      }

      void preServerSpecialize(ServerSpecializeArgs *args) override {
          api->setOption(DLCLOSE_MODULE_LIBRARY);
      }

  private:
      Api *api = nullptr;
      JNIEnv *env = nullptr;
      bool payloadLoaded = false;
      bool appAllowed = false;
      std::string currentPackage;
  };

  REGISTER_ZYGISK_MODULE(TeleInjectModule)
  REGISTER_ZYGISK_COMPANION(companion)
  