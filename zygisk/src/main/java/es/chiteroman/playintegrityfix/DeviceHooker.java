package es.chiteroman.playintegrityfix;

import android.util.Log;
import org.json.JSONObject;

import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

/**
 * Java-side device property spoof helpers.
 *
 * The bulk of the spoofing is done in native code by intercepting
 * __system_property_read_callback. This hooks all ro.* properties
 * to return spoofed device and build properties.
 *
 * This class patches cached Java fields so that values that were
 * already snapshotted before the property hook was installed are
 * still replaced.
 */
public class DeviceHooker {
    public static final String TAG = "PixelTester-J";
    private static final Map<String, String> values = new HashMap<>();

    public static void init(String json) {
        if (json == null || json.isEmpty()) {
            Log.i(TAG, "No device configuration provided");
            return;
        }
        try {
            JSONObject obj = new JSONObject(json);
            Iterator<String> keys = obj.keys();
            while (keys.hasNext()) {
                String k = keys.next();
                String v = obj.optString(k, "");
                if (!v.isEmpty()) values.put(k, v);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to parse device config", e);
            return;
        }
        Log.i(TAG, "Loaded " + values.size() + " device spoof values");

        // Clear any cached system properties
        clearBuildCaches();
        clearSystemPropertyCaches();
    }

    private static String s(String k) { 
        return values.get(k); 
    }

    private static Field findField(Class<?> cls, String name) {
        Class<?> c = cls;
        while (c != null && c != Object.class) {
            try { 
                return c.getDeclaredField(name); 
            }
            catch (NoSuchFieldException ignored) {}
            c = c.getSuperclass();
        }
        return null;
    }

    private static void setField(Class<?> cls, Object instance, String fieldName, Object value) {
        if (value == null) return;
        try {
            Field f = findField(cls, fieldName);
            if (f == null) return;
            f.setAccessible(true);
            f.set(instance, value);
            Log.d(TAG, cls.getSimpleName() + "." + fieldName + " = " + value);
        } catch (Throwable ignored) {}
    }

    private static void setStaticField(Class<?> cls, String fieldName, Object value) {
        if (value == null) return;
        try {
            Field f = findField(cls, fieldName);
            if (f == null) return;
            if ((f.getModifiers() & Modifier.STATIC) == 0) return;
            f.setAccessible(true);
            f.set(null, value);
            Log.d(TAG, cls.getSimpleName() + "." + fieldName + " (static) = " + value);
        } catch (Throwable ignored) {}
    }

    private static void clearStaticFields(String className, String[] fields) {
        try {
            Class<?> c = Class.forName(className);
            int cleared = 0;
            for (String fname : fields) {
                Field f = findField(c, fname);
                if (f == null) continue;
                try {
                    f.setAccessible(true);
                    f.set(null, null);
                    cleared++;
                } catch (Throwable ignored) {}
            }
            // Brute-force any Optional/Supplier static field on the class
            for (Field f : c.getDeclaredFields()) {
                String t = f.getType().getName();
                if (t.contains("Optional") || t.contains("Supplier")) {
                    try {
                        f.setAccessible(true);
                        f.set(null, null);
                        cleared++;
                    } catch (Throwable ignored) {}
                }
            }
            Log.i(TAG, className + ": cleared " + cleared + " cached field(s)");
        } catch (ClassNotFoundException e) {
            // Class not present on this device
        } catch (Throwable t) {
            Log.e(TAG, "clearStaticFields " + className, t);
        }
    }

    private static void clearBuildCaches() {
        try {
            Class<?> buildClass = Class.forName("android.os.Build");
            
            // Clear static fields that cache build properties
            String[] buildFields = {
                "BRAND", "DEVICE", "DISPLAY", "FINGERPRINT", "HOST", "ID", "MODEL",
                "PRODUCT", "TAGS", "TYPE", "USER", "HARDWARE", "BOARD", "BOOTLOADER",
                "MANUFACTURER", "SERIAL", "VERSION"
            };
            
            for (String fieldName : buildFields) {
                try {
                    Field f = buildClass.getDeclaredField(fieldName);
                    f.setAccessible(true);
                    f.set(null, null);
                } catch (Throwable ignored) {}
            }
            
            Log.i(TAG, "Build class caches cleared");
        } catch (Throwable t) {
            Log.e(TAG, "clearBuildCaches", t);
        }
    }

    private static void clearSystemPropertyCaches() {
        try {
            Class<?> systemPropertiesClass = Class.forName("android.os.SystemProperties");
            
            // Try to clear any cached properties
            for (Field f : systemPropertiesClass.getDeclaredFields()) {
                if ((f.getModifiers() & Modifier.STATIC) == 0) continue;
                String n = f.getName().toLowerCase();
                if (n.contains("cache") || n.contains("map")) {
                    try {
                        f.setAccessible(true);
                        Object val = f.get(null);
                        if (val instanceof Map) {
                            ((Map<?, ?>) val).clear();
                        }
                    } catch (Throwable ignored) {}
                }
            }
            
            Log.i(TAG, "SystemProperties caches cleared");
        } catch (Throwable t) {
            Log.e(TAG, "clearSystemPropertyCaches", t);
        }
    }
}
