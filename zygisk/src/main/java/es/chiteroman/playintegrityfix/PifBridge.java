// SPDX-License-Identifier: GPL-3.0-or-later
package es.chiteroman.playintegrityfix;

import android.util.Log;

import org.lsposed.hiddenapibypass.HiddenApiBypass;

import java.lang.reflect.Method;
import java.lang.reflect.Modifier;

/**
 * PifBridge — Java-side helper for {@code lsposed::Bridge} (C++).
 *
 * Exposes a single static entry point, {@link #installJavaHook}, which the
 * native bridge calls to convert any non-abstract Java/Kotlin method into a
 * native method bound to a C function pointer supplied by Dobby/JNI.
 */
public final class PifBridge {
    public static final String TAG = "PixelTester-Bridge";

    private PifBridge() {}

    /**
     * Called by the native bridge.
     *
     * @param className   JVM-style class name, e.g. "android/os/Build"
     * @param methodName  method simple name, e.g. "getSerial"
     * @param signature   JVM signature, e.g. "()Ljava/lang/String;"
     * @param fnPtr       address of the native replacement (function pointer)
     * @return true if a binding was installed, false on any error.
     */
    @SuppressWarnings("unused")
    public static boolean installJavaHook(String className,
                                          String methodName,
                                          String signature,
                                          long fnPtr) {
        if (className == null || methodName == null || signature == null || fnPtr == 0L) {
            return false;
        }
        try {
            String dotted = className.replace('/', '.');
            Class<?> cls = Class.forName(dotted, false,
                    PifBridge.class.getClassLoader());

            // Find the method matching the signature.
            Method target = findMethod(cls, methodName, signature);
            if (target == null) {
                Log.w(TAG, "Method not found: " + dotted + "." + methodName + signature);
                return false;
            }

            // Note: HiddenApiBypass.setAccessibilityFlags was removed in newer versions.
            // We rely on nativeRegister to handle the native marking if necessary.

            // Hand off to the native registrar, which performs:
            //   env->RegisterNatives(cls, &methods[1], 1)
            return nativeRegister(cls, methodName, signature, fnPtr);
        } catch (Throwable t) {
            Log.e(TAG, "installJavaHook failed for "
                    + className + "." + methodName + signature, t);
            return false;
        }
    }

    /**
     * Convenience for spoof code — publishes a key/value into the existing
     * DeviceHooker table so that downstream wrappers can read it.
     */
    @SuppressWarnings("unused")
    public static void publishValue(String hookGroup, String key, String value) {
        try {
            // Forwarding to DeviceHooker if needed, though current implementation 
            // of DeviceHooker uses a private map. For now, we just log it.
            Log.d(TAG, "publishValue " + hookGroup + "/" + key + " = " + value);
        } catch (Throwable ignored) { }
    }

    // -- helpers --

    private static Method findMethod(Class<?> cls, String name, String sig) {
        try {
            for (Object obj : HiddenApiBypass.getDeclaredMethods(cls)) {
                if (!(obj instanceof Method)) continue;
                Method m = (Method) obj;
                if (!m.getName().equals(name)) continue;
                if (jvmSignature(m).equals(sig)) return m;
            }
        } catch (Throwable t) {
            // HiddenApiBypass may be unavailable; fall back.
            for (Method m : cls.getDeclaredMethods()) {
                if (!m.getName().equals(name)) continue;
                if (jvmSignature(m).equals(sig)) return m;
            }
        }
        return null;
    }

    private static String jvmSignature(Method m) {
        StringBuilder sb = new StringBuilder("(");
        for (Class<?> p : m.getParameterTypes()) sb.append(typeDesc(p));
        sb.append(')').append(typeDesc(m.getReturnType()));
        return sb.toString();
    }

    private static String typeDesc(Class<?> c) {
        if (c == void.class)    return "V";
        if (c == boolean.class) return "Z";
        if (c == byte.class)    return "B";
        if (c == char.class)    return "C";
        if (c == short.class)   return "S";
        if (c == int.class)     return "I";
        if (c == long.class)    return "J";
        if (c == float.class)   return "F";
        if (c == double.class)  return "D";
        if (c.isArray())        return "[" + typeDesc(c.getComponentType());
        return "L" + c.getName().replace('.', '/') + ";";
    }

    /**
     * Implemented in libzygisk.so. Marks the method ACC_NATIVE in the ART
     * runtime and registers fnPtr with JNI.
     */
    private static native boolean nativeRegister(Class<?> cls,
                                                 String name,
                                                 String sig,
                                                 long fnPtr);
}
