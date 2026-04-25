// SPDX-License-Identifier: GPL-3.0-or-later
// LSPosed-style bridge facade for Pixel Tester.
//
// This is a minimal facade that exposes an LSPosed-XposedBridge-shaped API
// on top of the module's existing engines:
//   * Native side (this header)         -> Dobby (already used by zygisk.cpp)
//   * Java side  (PifBridge.java)       -> dynamic native-method registration
//                                          + Hidden API bypass
//
// The goal is NOT to load arbitrary external Xposed modules. The goal is to
// give pif's spoof code a single, named API to register native+Java hooks,
// so additional spoof targets (TelephonyManager, WifiInfo, MediaDrm, ...)
// can be added incrementally without sprinkling Dobby/JNI calls throughout
// the codebase.
#pragma once

#include <jni.h>
#include <string_view>

namespace lsposed {

class Bridge {
public:
    static Bridge& get();

    // Initialize against the current ART runtime + JNIEnv. Idempotent.
    void initialize(JNIEnv *env);

    // ---- Native hooks (Dobby-backed) ----
    // Hook an arbitrary function pointer.
    bool hookNative(void *target, void *replacement, void **backup);

    // Resolve a symbol from a loaded library and hook it.
    // `library` is dlopen()-style ("libc.so", "libandroid_runtime.so", ...).
    bool hookSymbol(std::string_view library, std::string_view symbol,
                    void *replacement, void **backup);

    // ---- Java hooks (delegated to PifBridge.installJavaHook) ----
    // Replace a Java method by registering `replacement` as a JNI native
    // for it (with the JVM-style signature).
    // `replacement` MUST follow JNI calling convention:
    //     return_t JNICALL fn(JNIEnv*, jclass|jobject, args...)
    //
    // Implementation strategy (pure JNI, no YAHFA needed for our use case):
    //   1. PifBridge.installJavaHook() looks up the target Method via
    //      reflection and HiddenApiBypass.
    //   2. It rewrites the method's access flags to ACC_NATIVE.
    //   3. It calls JNIEnv::RegisterNatives() to bind our C function.
    //
    // This is the same trick used by Pine / SandHook in their pure-Java
    // fallback path. It works for non-abstract, non-constructor methods
    // and is sufficient for spoofing TelephonyManager / WifiInfo getters.
    bool hookJavaMethod(JNIEnv *env,
                        std::string_view className,
                        std::string_view methodName,
                        std::string_view signature,
                        void *replacement);

    bool initialized() const { return initialized_; }

private:
    Bridge() = default;
    bool initialized_ = false;
    jclass  bridge_class_ = nullptr;        // global ref to PifBridge
    jmethodID install_hook_mid_ = nullptr;  // PifBridge.installJavaHook(...)
};

} // namespace lsposed
