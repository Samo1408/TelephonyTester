// SPDX-License-Identifier: GPL-3.0-or-later
#include "bridge.h"
#include "Dobby/include/dobby.h"

#include <android/log.h>
#include <dlfcn.h>
#include <string>

#define LOG_TAG "PixelTester-Bridge"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO,  LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

namespace lsposed {

Bridge& Bridge::get() {
    static Bridge inst;
    return inst;
}

void Bridge::initialize(JNIEnv *env) {
    if (initialized_) return;
    if (!env) {
        LOGE("initialize: null JNIEnv");
        return;
    }
    // Look up the Java-side helper. The class is loaded by EntryPoint
    // from the injected classes.dex BEFORE this is called.
    jclass cls = env->FindClass(
        "es/chiteroman/playintegrityfix/bridge/PifBridge");
    if (!cls) {
        env->ExceptionClear();
        LOGE("PifBridge class not found — Java hooks disabled");
        // Native side still works.
        initialized_ = true;
        return;
    }
    bridge_class_ = (jclass)env->NewGlobalRef(cls);
    install_hook_mid_ = env->GetStaticMethodID(
        bridge_class_, "installJavaHook",
        "(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;J)Z");
    if (!install_hook_mid_) {
        env->ExceptionClear();
        LOGE("PifBridge.installJavaHook not found");
    }
    initialized_ = true;
    LOGI("Bridge initialized (java=%s)", install_hook_mid_ ? "yes" : "no");
}

bool Bridge::hookNative(void *target, void *replacement, void **backup) {
    if (!target || !replacement) return false;
    int rc = DobbyHook(target,
                       (dobby_dummy_func_t)replacement,
                       (dobby_dummy_func_t*)backup);
    if (rc != 0) {
        LOGE("DobbyHook(%p) failed rc=%d", target, rc);
        return false;
    }
    return true;
}

bool Bridge::hookSymbol(std::string_view library, std::string_view symbol,
                        void *replacement, void **backup) {
    std::string lib(library);
    std::string sym(symbol);
    void *handle = dlopen(lib.c_str(), RTLD_NOW | RTLD_NOLOAD);
    if (!handle) handle = dlopen(lib.c_str(), RTLD_NOW);
    if (!handle) {
        LOGE("dlopen %s failed: %s", lib.c_str(), dlerror());
        return false;
    }
    void *addr = dlsym(handle, sym.c_str());
    if (!addr) {
        LOGE("dlsym %s in %s failed", sym.c_str(), lib.c_str());
        return false;
    }
    return hookNative(addr, replacement, backup);
}

bool Bridge::hookJavaMethod(JNIEnv *env,
                            std::string_view className,
                            std::string_view methodName,
                            std::string_view signature,
                            void *replacement) {
    if (!env || !replacement) return false;
    if (!install_hook_mid_) {
        LOGE("hookJavaMethod: Java side not initialised");
        return false;
    }
    std::string c(className), m(methodName), s(signature);
    jstring jc = env->NewStringUTF(c.c_str());
    jstring jm = env->NewStringUTF(m.c_str());
    jstring js = env->NewStringUTF(s.c_str());

    jboolean ok = env->CallStaticBooleanMethod(
        bridge_class_, install_hook_mid_, jc, jm, js,
        reinterpret_cast<jlong>(replacement));

    if (env->ExceptionCheck()) {
        env->ExceptionDescribe();
        env->ExceptionClear();
        ok = JNI_FALSE;
    }
    env->DeleteLocalRef(jc);
    env->DeleteLocalRef(jm);
    env->DeleteLocalRef(js);
    return ok == JNI_TRUE;
}

} // namespace lsposed
