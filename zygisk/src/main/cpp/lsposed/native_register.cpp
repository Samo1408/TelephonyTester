// SPDX-License-Identifier: GPL-3.0-or-later
//
// Implementation of PifBridge.nativeRegister(Class, String, String, long).
// Called from Java to bind a C function pointer to a Java method.
//
// Strategy:
//   1. Resolve the target Method via JNI (GetMethodID / GetStaticMethodID).
//   2. Build a JNINativeMethod with the supplied function pointer.
//   3. Call env->RegisterNatives(cls, &m, 1).
//
// IMPORTANT: RegisterNatives() requires the method to be DECLARED native in
// the dex, OR for the runtime to allow overriding (which ART does for native
// methods only). For non-native target methods, this will fail — that case
// must be handled by spoof-value publication through DeviceHooker instead.
// We log clearly so callers can tell which path failed.
#include <jni.h>
#include <android/log.h>
#include <string>

#define LOG_TAG "PixelTester-Bridge"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO,  LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

extern "C"
JNIEXPORT jboolean JNICALL
Java_es_chiteroman_playintegrityfix_bridge_PifBridge_nativeRegister(
        JNIEnv *env, jclass /*self*/,
        jclass targetClass, jstring jName, jstring jSig, jlong fnPtr) {

    if (!targetClass || !jName || !jSig || fnPtr == 0) {
        LOGE("nativeRegister: invalid args");
        return JNI_FALSE;
    }

    const char *name = env->GetStringUTFChars(jName, nullptr);
    const char *sig  = env->GetStringUTFChars(jSig,  nullptr);

    JNINativeMethod m{};
    m.name      = const_cast<char*>(name);
    m.signature = const_cast<char*>(sig);
    m.fnPtr     = reinterpret_cast<void*>(fnPtr);

    jint rc = env->RegisterNatives(targetClass, &m, 1);
    if (env->ExceptionCheck()) {
        env->ExceptionDescribe();
        env->ExceptionClear();
    }

    env->ReleaseStringUTFChars(jName, name);
    env->ReleaseStringUTFChars(jSig,  sig);

    if (rc != 0) {
        LOGE("RegisterNatives failed (rc=%d) for %s%s — target may not be declared native",
             rc, name, sig);
        return JNI_FALSE;
    }
    LOGI("RegisterNatives OK for %s%s", name, sig);
    return JNI_TRUE;
}
