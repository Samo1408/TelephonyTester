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

std::string deviceMapToJson() {
    std::string j = "{";
    bool first = true;
    for (const auto &[k, v] : gConfig.deviceMap) {
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
    j += std::string("\"hookBuildProperties\":") + b(gConfig.hookBuildProperties) + ",";
    j += std::string("\"hookSystemProperties\":") + b(gConfig.hookSystemProperties) + ",";
    j += std::string("\"hookVendorProperties\":") + b(gConfig.hookVendorProperties) + ",";
    j += std::string("\"hookOdmProperties\":") + b(gConfig.hookOdmProperties) + ",";
    j += std::string("\"hookProductProperties\":") + b(gConfig.hookProductProperties) + ",";
    j += std::string("\"hookDebugProperties\":") + b(gConfig.hookDebugProperties);
    j += "}";
    return j;
}

// Map our config keys to the system property names across all partitions
struct PropMap { const char* prop; const char* configKey; };
static const PropMap kPropMappings[] = {
    // Device and Product
    {"ro.product.brand", "brand"},
    {"ro.product.manufacturer", "manufacturer"},
    {"ro.product.model", "model"},
    {"ro.product.name", "productName"},
    {"ro.product.device", "deviceCode"},
    {"ro.product.board", "board"},
    {"ro.product.cpu.abi", "boardPlatform"},
    
    // Build
    {"ro.build.id", "buildId"},
    {"ro.build.display.id", "buildDisplayId"},
    {"ro.build.version.incremental", "buildIncremental"},
    {"ro.build.version.release", "buildRelease"},
    {"ro.build.version.sdk", "buildSdk"},
    {"ro.build.version.security_patch", "securityPatch"},
    {"ro.build.description", "buildDescription"},
    {"ro.build.flavor", "buildFlavor"},
    {"ro.build.product", "buildProduct"},
    {"ro.build.characteristics", "buildCharacteristics"},
    {"ro.build.fingerprint", "buildFingerprint"},
    
    // Hardware
    {"ro.hardware", "hardware"},
    {"ro.board.platform", "boardPlatform"},
    {"ro.bootloader", "bootloader"},
    {"gsm.version.baseband", "baseband"},
    
    // SoC
    {"ro.soc.model", "socModel"},
    {"ro.soc.manufacturer", "socManufacturer"},
};

// Partitions to apply properties to
static const char* kPartitions[] = {
    "system", "vendor", "odm", "product", "vendor_dlkm", "odm_dlkm", "system_ext", "system_dlkm"
};

static const char* lookupSpoofValue(const std::string_view& propName) {
    if (!gConfig.spoofDevice) return nullptr;

    // Check if it's a debug property
    if (gConfig.hookDebugProperties) {
        if (propName == "ro.debuggable") return "0";
        if (propName == "ro.secure") return "1";
        if (propName == "ro.adb.secure") return "1";
    }

    // Check standard mappings
    for (const auto& m : kPropMappings) {
        if (propName == m.prop) {
            auto it = gConfig.deviceMap.find(m.configKey);
            if (it != gConfig.deviceMap.end() && !it->second.empty()) return it->second.c_str();
        }
        
        // Check partition-specific variants (e.g., ro.product.system.model)
        for (const char* part : kPartitions) {
            std::string partProp = "ro.product.";
            partProp += part;
            partProp += ".";
            
            // Extract the base property name (e.g., "model" from "ro.product.model")
            std::string baseProp = m.prop;
            size_t lastDot = baseProp.find_last_of('.');
            if (lastDot != std::string::npos) {
                partProp += baseProp.substr(lastDot + 1);
                if (propName == partProp) {
                    auto it = gConfig.deviceMap.find(m.configKey);
                    if (it != gConfig.deviceMap.end() && !it->second.empty()) return it->second.c_str();
                }
            }
            
            // Also check ro.build.[partition].fingerprint etc
            std::string buildPartProp = "ro.";
            if (std::string(m.prop).find("ro.build.") == 0) {
                buildPartProp += "build.";
                buildPartProp += part;
                buildPartProp += ".";
                buildPartProp += std::string(m.prop).substr(9);
                if (propName == buildPartProp) {
                    auto it = gConfig.deviceMap.find(m.configKey);
                    if (it != gConfig.deviceMap.end() && !it->second.empty()) return it->second.c_str();
                }
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
    jclass inMemoryDexClassLoaderClass = gEnv->FindClass("dalvik/system/InMemoryDexClassLoader");
    jmethodID constructor = gEnv->GetMethodID(inMemoryDexClassLoaderClass, "<init>", "(Ljava/nio/ByteBuffer;Ljava/lang/ClassLoader;)V");
    jobject classLoader = gEnv->NewObject(inMemoryDexClassLoaderClass, constructor, dexBuffer, systemClassLoader);
    if (gEnv->ExceptionCheck()) { gEnv->ExceptionClear(); return; }

    jmethodID loadClass = gEnv->GetMethodID(classLoaderClass, "loadClass", "(Ljava/lang/String;)Ljava/lang/Class;");
    jstring entryClassName = gEnv->NewStringUTF("es.chiteroman.playintegrityfix.EntryPoint");
    jclass entryClass = (jclass) gEnv->CallObjectMethod(classLoader, loadClass, entryClassName);
    if (gEnv->ExceptionCheck()) { gEnv->ExceptionClear(); return; }

    jmethodID init = gEnv->GetStaticMethodID(entryClass, "init", "(Ljava/lang/String;Ljava/lang/String;)V");
    jstring deviceJson = gEnv->NewStringUTF(deviceMapToJson().c_str());
    jstring flagsJson = gEnv->NewStringUTF(flagsToJson().c_str());
    gEnv->CallStaticVoidMethod(entryClass, init, deviceJson, flagsJson);
    if (gEnv->ExceptionCheck()) { gEnv->ExceptionClear(); return; }

    LOGD("[INJECT] successfully initialized Java entry point");
}

} // namespace

class PixelTester : public zygisk::ModuleBase {
public:
    void onLoad(zygisk::Api *api, JNIEnv *env) override {
        gEnv = env;
    }

    void preAppSpecialize(zygisk::AppSpecializeArgs *args) override {
        const char *process = gEnv->GetStringUTFChars(args->nice_name, nullptr);
        std::string pkg = process ? process : "";
        gEnv->ReleaseStringUTFChars(args->nice_name, process);

        int fd = args->companion_fd;
        if (fd < 0) return;

        applySocketTimeout(fd);
        if (!pif::readConfig(fd, gConfig)) {
            LOGE("failed to read config from companion");
            return;
        }

        if (!gConfig.spoofDevice) return;
        if (!gConfig.allowedApps.empty() && !gConfig.isAllowed(pkg)) return;

        if (gConfig.needsDex()) {
            if (!readVector(fd, gDexBytes)) {
                LOGE("failed to read dex from companion");
            }
        }

        if (gConfig.needsPropertyHook()) {
            doHookProperty();
        }
    }

    void postAppSpecialize(const zygisk::AppSpecializeArgs *) override {
        if (gConfig.spoofDevice && !gDexBytes.empty()) {
            injectDex();
        }
        gDexBytes.clear();
        gDexBytes.shrink_to_fit();
    }

    void preServerSpecialize(zygisk::ServerSpecializeArgs *) override {
    }

private:
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
