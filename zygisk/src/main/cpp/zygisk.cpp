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

#define LOGD(...) __android_log_print(ANDROID_LOG_DEBUG, "PixelTester", __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, "PixelTester", __VA_ARGS__)

#define DEX_PATH      "/data/adb/modules/pixeltester/classes.dex"
#define MODULE_PROP   "/data/adb/modules/pixeltester/module.prop"
#define CONFIG_PATH   "/data/adb/modules/pixeltester/device.conf"
#define CUSTOM_CONFIG "/data/adb/pixeltester.conf"

namespace {

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
    std::string out; out.reserve(value.size() + 8);
    for (char c : value) {
        switch (c) {
            case '\\': out += "\\\\"; break;
            case '"':  out += "\\\""; break;
            case '\n': out += "\\n"; break;
            case '\r': out += "\\r"; break;
            case '\t': out += "\\t"; break;
            default:   out += c; break;
        }
    }
    return out;
}

std::string deviceMapToJson() {
    std::string j = "{"; bool first = true;
    for (const auto &[k, v] : gConfig.deviceMap) {
        if (!first) j += ","; first = false;
        j += "\"" + jsonEscape(k) + "\":\"" + jsonEscape(v) + "\"";
    }
    j += "}"; return j;
}

std::string flagsToJson() {
    auto b = [](bool x){ return x ? "true" : "false"; };
    std::string j = "{";
    j += std::string("\"hookBuildProperties\":")   + b(gConfig.hookBuildProperties)   + ",";
    j += std::string("\"hookSystemProperties\":")  + b(gConfig.hookSystemProperties)  + ",";
    j += std::string("\"hookVendorProperties\":")  + b(gConfig.hookVendorProperties)  + ",";
    j += std::string("\"hookOdmProperties\":")     + b(gConfig.hookOdmProperties)     + ",";
    j += std::string("\"hookProductProperties\":") + b(gConfig.hookProductProperties) + ",";
    j += std::string("\"hookDebugProperties\":")   + b(gConfig.hookDebugProperties)   + ",";
    j += std::string("\"hookSerial\":")            + b(gConfig.hookSerial)            + ",";
    j += std::string("\"hookAndroidId\":")         + b(gConfig.hookAndroidId)         + ",";
    j += std::string("\"hookGsfId\":")             + b(gConfig.hookGsfId)             + ",";
    j += std::string("\"hookDrmId\":")             + b(gConfig.hookDrmId)             + ",";
    j += std::string("\"hookImei\":")              + b(gConfig.hookImei)              + ",";
    j += std::string("\"hookWifiMac\":")           + b(gConfig.hookWifiMac)           + ",";
    j += std::string("\"hookWifiInfo\":")          + b(gConfig.hookWifiInfo)          + ",";
    j += std::string("\"hookCarrier\":")           + b(gConfig.hookCarrier)           + ",";
    j += std::string("\"hookPhoneNumber\":")       + b(gConfig.hookPhoneNumber);
    j += "}"; return j;
}

/*
 * Map: base property name (without partition prefix) -> config key.
 * NOTE: ro.product.cpu.abi is intentionally NOT spoofed — overriding it
 * causes immediate native crashes / black screens.
 */
struct PropMap { const char* base; const char* configKey; };

// "ro.product.<part>" properties
static const PropMap kProductProps[] = {
    {"brand",        "brand"},
    {"manufacturer", "manufacturer"},
    {"model",        "model"},
    {"name",         "productName"},
    {"device",       "deviceCode"},
    {"board",        "board"},
};

// "ro.build.<part>" properties (also have partition variants like ro.build.system.fingerprint)
static const PropMap kBuildProps[] = {
    {"id",                       "buildId"},
    {"display.id",               "buildDisplayId"},
    {"version.incremental",      "buildIncremental"},
    {"version.release",          "buildRelease"},
    {"version.release_or_codename","buildRelease"},
    {"version.sdk",              "buildSdk"},
    {"version.security_patch",   "securityPatch"},
    {"description",              "buildDescription"},
    {"flavor",                   "buildFlavor"},
    {"product",                  "buildProduct"},
    {"characteristics",          "buildCharacteristics"},
    {"fingerprint",              "buildFingerprint"},
    {"tags",                     nullptr}, // no value, but recognized
};

// Standalone properties (full name -> config key)
static const PropMap kMiscProps[] = {
    {"ro.hardware",            "hardware"},
    {"ro.hardware.chipname",   "boardPlatform"},
    {"ro.board.platform",      "boardPlatform"},
    {"ro.bootloader",          "bootloader"},
    {"gsm.version.baseband",   "baseband"},
    {"ro.soc.model",           "socModel"},
    {"ro.soc.manufacturer",    "socManufacturer"},
};

// Identity-related native properties.
// Each entry pairs the system_properties name with both the value key
// and the toggle flag that gates it (checked at lookup time).
struct IdentityPropMap { const char* name; const char* configKey; bool pif::Config::* toggle; };
static const IdentityPropMap kIdentityProps[] = {
    // Serial
    {"ro.serialno",                  "serialNumber",  &pif::Config::hookSerial},
    {"ro.boot.serialno",             "serialNumber",  &pif::Config::hookSerial},
    {"sys.serialno",                 "serialNumber",  &pif::Config::hookSerial},
    // WiFi MAC
    {"ro.boot.wifimacaddr",          "wifiMac",       &pif::Config::hookWifiMac},
    {"persist.sys.wifi.mac",         "wifiMac",       &pif::Config::hookWifiMac},
    // Carrier / SIM
    {"gsm.sim.operator.numeric",     "simOperator",       &pif::Config::hookCarrier},
    {"gsm.sim.operator.alpha",       "simOperatorName",   &pif::Config::hookCarrier},
    {"gsm.sim.operator.iso-country", "simCountryIso",     &pif::Config::hookCarrier},
    {"gsm.operator.numeric",         "networkOperator",   &pif::Config::hookCarrier},
    {"gsm.operator.alpha",           "carrierName",       &pif::Config::hookCarrier},
    {"gsm.operator.iso-country",     "networkCountryIso", &pif::Config::hookCarrier},
};

// Partitions for ro.product.<partition>.<base> and ro.build.<partition>.<base>
static const char* kPartitions[] = {
    "system", "system_ext", "vendor", "vendor_dlkm", "odm", "odm_dlkm", "product"
};

static bool partitionEnabled(const char* part) {
    std::string_view p(part);
    if (p == "system" || p == "system_ext" || p == "system_dlkm")
        return gConfig.hookSystemProperties;
    if (p == "vendor" || p == "vendor_dlkm")
        return gConfig.hookVendorProperties;
    if (p == "odm" || p == "odm_dlkm")
        return gConfig.hookOdmProperties;
    if (p == "product")
        return gConfig.hookProductProperties;
    return false;
}

static const char* lookupValue(const char* configKey) {
    if (!configKey) return nullptr;
    auto it = gConfig.deviceMap.find(configKey);
    if (it == gConfig.deviceMap.end() || it->second.empty()) return nullptr;
    return it->second.c_str();
}

static const char* lookupSpoofValue(std::string_view propName) {
    if (!gConfig.spoofDevice) return nullptr;

    // Debug properties
    if (gConfig.hookDebugProperties) {
        if (propName == "ro.debuggable")        return "0";
        if (propName == "ro.secure")            return "1";
        if (propName == "ro.adb.secure")        return "1";
        if (propName == "ro.build.type")        return "user";
        if (propName == "ro.build.tags")        return "release-keys";
        if (propName == "ro.boot.verifiedbootstate") return "green";
        if (propName == "ro.boot.flash.locked") return "1";
        if (propName == "ro.boot.veritymode")   return "enforcing";
    }

    // Misc full-name properties (always governed by build/system flags)
    for (const auto& m : kMiscProps) {
        if (propName == m.base) {
            if (!gConfig.hookBuildProperties && !gConfig.hookSystemProperties) return nullptr;
            return lookupValue(m.configKey);
        }
    }

    // Identity props are gated by their own per-feature toggle, NOT by
    // build/system/vendor toggles (so users can spoof e.g. SERIAL without
    // enabling vendor properties — which is the safer combination).
    for (const auto& m : kIdentityProps) {
        if (propName == m.name) {
            if (!(gConfig.*(m.toggle))) return nullptr;
            return lookupValue(m.configKey);
        }
    }

    // ro.product.<base> and ro.product.<partition>.<base>
    if (propName.rfind("ro.product.", 0) == 0) {
        std::string_view rest = propName.substr(11); // after "ro.product."
        // Plain ro.product.<base>
        for (const auto& m : kProductProps) {
            if (rest == m.base) {
                if (!gConfig.hookProductProperties && !gConfig.hookBuildProperties) return nullptr;
                return lookupValue(m.configKey);
            }
        }
        // ro.product.<part>.<base>
        for (const char* part : kPartitions) {
            std::string prefix = std::string(part) + ".";
            if (rest.rfind(prefix, 0) == 0) {
                if (!partitionEnabled(part)) return nullptr;
                std::string_view base = rest.substr(prefix.size());
                for (const auto& m : kProductProps) {
                    if (base == m.base) return lookupValue(m.configKey);
                }
                return nullptr;
            }
        }
        return nullptr;
    }

    // ro.build.<base> and ro.build.<partition>.<base>
    if (propName.rfind("ro.build.", 0) == 0) {
        std::string_view rest = propName.substr(9); // after "ro.build."
        // Try partition prefix first
        for (const char* part : kPartitions) {
            std::string prefix = std::string(part) + ".";
            if (rest.rfind(prefix, 0) == 0) {
                if (!partitionEnabled(part)) return nullptr;
                std::string_view base = rest.substr(prefix.size());
                for (const auto& m : kBuildProps) {
                    if (base == m.base) return lookupValue(m.configKey);
                }
                return nullptr;
            }
        }
        // Plain ro.build.<base>
        if (!gConfig.hookBuildProperties) return nullptr;
        for (const auto& m : kBuildProps) {
            if (rest == m.base) return lookupValue(m.configKey);
        }
        return nullptr;
    }

    return nullptr;
}

void modifyCallback(void *cookie, const char *name, const char *value, uint32_t serial) {
    if (!cookie || !name || !value || !o_callback) return;
    const char *oldValue = value;
    if (const char* spoof = lookupSpoofValue(std::string_view(name)); spoof) value = spoof;
    if (gConfig.debug && value != oldValue) LOGD("[%s]: %s -> %s", name, oldValue, value);
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
            if (gConfig.debug) LOGD("[get %s]: -> %s", name, value);
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
    if (gDexBytes.empty()) { LOGD("[INJECT] no dex payload available"); return; }

    jclass classLoaderClass = gEnv->FindClass("java/lang/ClassLoader");
    jmethodID getSystemClassLoader = gEnv->GetStaticMethodID(
            classLoaderClass, "getSystemClassLoader", "()Ljava/lang/ClassLoader;");
    jobject systemClassLoader = gEnv->CallStaticObjectMethod(classLoaderClass, getSystemClassLoader);
    if (gEnv->ExceptionCheck()) { gEnv->ExceptionClear(); return; }

    jobject dexBuffer = gEnv->NewDirectByteBuffer(gDexBytes.data(), (jlong)gDexBytes.size());
    jclass inMemoryDexClassLoaderClass = gEnv->FindClass("dalvik/system/InMemoryDexClassLoader");
    jmethodID constructor = gEnv->GetMethodID(inMemoryDexClassLoaderClass, "<init>",
                                              "(Ljava/nio/ByteBuffer;Ljava/lang/ClassLoader;)V");
    jobject classLoader = gEnv->NewObject(inMemoryDexClassLoaderClass, constructor, dexBuffer, systemClassLoader);
    if (gEnv->ExceptionCheck()) { gEnv->ExceptionClear(); return; }

    jmethodID loadClass = gEnv->GetMethodID(classLoaderClass, "loadClass",
                                            "(Ljava/lang/String;)Ljava/lang/Class;");
    jstring entryClassName = gEnv->NewStringUTF("es.chiteroman.playintegrityfix.EntryPoint");
    jclass entryClass = (jclass) gEnv->CallObjectMethod(classLoader, loadClass, entryClassName);
    if (gEnv->ExceptionCheck()) { gEnv->ExceptionClear(); return; }

    jmethodID init = gEnv->GetStaticMethodID(entryClass, "init",
                                             "(Ljava/lang/String;Ljava/lang/String;)V");
    jstring deviceJson = gEnv->NewStringUTF(deviceMapToJson().c_str());
    jstring flagsJson  = gEnv->NewStringUTF(flagsToJson().c_str());
    gEnv->CallStaticVoidMethod(entryClass, init, deviceJson, flagsJson);
    if (gEnv->ExceptionCheck()) { gEnv->ExceptionClear(); return; }

    LOGD("[INJECT] EntryPoint.init done");
}

/*
 * Processes that we MUST never spoof — touching them causes black screens,
 * boot loops, or telephony failures.
 */
static bool containsAny(std::string_view value, std::initializer_list<std::string_view> needles) {
    for (auto needle : needles) {
        if (!needle.empty() && value.find(needle) != std::string_view::npos) return true;
    }
    return false;
}

static bool isUnsafeProcess(const std::string& pkg) {
    if (pkg.empty()) return true;
    if (pkg == "system" || pkg == "system_server" || pkg == "zygote" || pkg == "zygote64") return true;
    if (pkg == "com.android.systemui") return true;
    if (pkg == "com.android.phone") return true;
    if (pkg == "com.android.nfc") return true;
    if (pkg == "com.android.bluetooth") return true;
    if (pkg == "com.android.launcher3") return true;
    if (pkg == "com.google.android.apps.nexuslauncher") return true;
    if (pkg == "com.google.android.setupwizard") return true;
    if (pkg == "com.android.permissioncontroller") return true;
    if (pkg == "com.android.providers.media.module") return true;
    if (containsAny(pkg, {".launcher", "launcher", "inputmethod", "wallpaper", "telephony", "ims"})) return true;
    return false;
}

} // namespace

class PixelTester : public zygisk::ModuleBase {
public:
    void onLoad(zygisk::Api *api, JNIEnv *env) override { this->api = api; gEnv = env; }

    void preAppSpecialize(zygisk::AppSpecializeArgs *args) override {
        if (!args || !args->nice_name) {
            gConfig = {};
            gDexBytes.clear();
            return;
        }

        const char *process = gEnv->GetStringUTFChars(args->nice_name, nullptr);
        std::string pkg = process ? process : "";
        if (process) {
            gEnv->ReleaseStringUTFChars(args->nice_name, process);
        }

        // Reset state per process
        gConfig = {};
        gDexBytes.clear();

        int fd = api->connectCompanion();
        if (fd < 0) return;
        applySocketTimeout(fd);
        if (!pif::readConfig(fd, gConfig)) {
            LOGE("failed to read config from companion");
            close(fd); return;
        }

        // Hard safety: never spoof system / launcher / telephony processes
        if (isUnsafeProcess(pkg)) {
            if (gConfig.debug) LOGD("skip unsafe process: %s", pkg.c_str());
            gConfig.spoofDevice = false;
            close(fd); return;
        }

        bool isAllowed = false;
        if (gConfig.allowedApps.count("*")) isAllowed = true;
        else if (!gConfig.allowedApps.empty() && gConfig.isAllowed(pkg)) isAllowed = true;

        if (!gConfig.spoofDevice || !isAllowed) {
            gConfig.spoofDevice = false;
            close(fd); return;
        }

        if (gConfig.needsDex()) {
            if (!readVector(fd, gDexBytes)) LOGE("failed to read dex from companion");
        }

        if (gConfig.needsPropertyHook()) doHookProperty();
        close(fd);
    }

    void postAppSpecialize(const zygisk::AppSpecializeArgs *) override {
        if (gConfig.spoofDevice && !gDexBytes.empty()) injectDex();
        gDexBytes.clear(); gDexBytes.shrink_to_fit();
    }

    void preServerSpecialize(zygisk::ServerSpecializeArgs *) override {
        // Never spoof system_server — would brick the device.
        gConfig.spoofDevice = false;
        gDexBytes.clear();
    }

    void postServerSpecialize(const zygisk::ServerSpecializeArgs *) override {
        gDexBytes.clear(); gDexBytes.shrink_to_fit();
    }

private:
    zygisk::Api *api = nullptr;
};

static void companion_handler(int fd) {
    pif::Config config;
    std::vector<uint8_t> configBytes;
    if (loadConfigBytes(configBytes)) {
        config = pif::parseConfig(std::string_view((char*)configBytes.data(), configBytes.size()));
    }
    applySocketTimeout(fd);
    if (!pif::writeConfig(fd, config)) return;

    if (config.needsDex()) {
        std::vector<uint8_t> dex;
        readFileBytes(DEX_PATH, dex);
        writeVector(fd, dex);
    }
}

REGISTER_ZYGISK_MODULE(PixelTester)
REGISTER_ZYGISK_COMPANION(companion_handler)
