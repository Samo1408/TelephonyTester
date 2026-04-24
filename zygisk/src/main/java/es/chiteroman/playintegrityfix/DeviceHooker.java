package es.chiteroman.playintegrityfix;

import android.util.Log;
import org.json.JSONObject;

import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

public class DeviceHooker {
    public static final String TAG = "PixelTester-J";
    private static final Map<String, String> values = new HashMap<>();

    public static void init(String json, boolean patchBuild) {
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
        } catch (Throwable t) {
            Log.e(TAG, "Failed to parse device config", t);
            return;
        }
        Log.i(TAG, "Loaded " + values.size() + " spoof values; patchBuild=" + patchBuild);
        if (patchBuild) patchBuildFields();
    }

    private static String s(String k) { return values.get(k); }

    private static void setStaticField(Class<?> cls, String fieldName, Object value) {
        if (value == null) return;
        try {
            Field f = cls.getDeclaredField(fieldName);
            f.setAccessible(true);
            // Try to clear the FINAL bit through Android's "accessFlags" backing field.
            try {
                Field af = Field.class.getDeclaredField("accessFlags");
                af.setAccessible(true);
                af.setInt(f, f.getModifiers() & ~Modifier.FINAL);
            } catch (Throwable ignored) {
                // Some ROMs don't expose accessFlags — try standard "modifiers"
                try {
                    Field mf = Field.class.getDeclaredField("modifiers");
                    mf.setAccessible(true);
                    mf.setInt(f, f.getModifiers() & ~Modifier.FINAL);
                } catch (Throwable ignored2) { /* fall through, set may still work */ }
            }
            f.set(null, value);
        } catch (Throwable t) {
            // Don't log every failure as error — many fields are optional per ROM.
            if (Log.isLoggable(TAG, Log.DEBUG)) Log.d(TAG, "skip " + cls.getSimpleName() + "." + fieldName + ": " + t.getMessage());
        }
    }

    private static void patchBuildFields() {
        try {
            Class<?> b = Class.forName("android.os.Build");
            setStaticField(b, "BRAND",        s("brand"));
            setStaticField(b, "MANUFACTURER", s("manufacturer"));
            setStaticField(b, "MODEL",        s("model"));
            setStaticField(b, "PRODUCT",      s("productName"));
            setStaticField(b, "DEVICE",       s("deviceCode"));
            setStaticField(b, "BOARD",        s("board"));
            setStaticField(b, "HARDWARE",     s("hardware"));
            setStaticField(b, "FINGERPRINT",  s("buildFingerprint"));
            setStaticField(b, "ID",           s("buildId"));
            setStaticField(b, "DISPLAY",      s("buildDisplayId"));
            setStaticField(b, "BOOTLOADER",   s("bootloader"));
            setStaticField(b, "TYPE",         "user");
            setStaticField(b, "TAGS",         "release-keys");

            Class<?> v = Class.forName("android.os.Build$VERSION");
            setStaticField(v, "INCREMENTAL",    s("buildIncremental"));
            setStaticField(v, "RELEASE",        s("buildRelease"));
            setStaticField(v, "SECURITY_PATCH", s("securityPatch"));

            // SDK_INT must remain consistent with the actual runtime to avoid app crashes.
            // We deliberately do NOT patch SDK_INT — many apps (including Play Services)
            // crash if it disagrees with the real platform.

            Log.i(TAG, "Build fields patched successfully");
        } catch (Throwable t) {
            Log.e(TAG, "Failed to patch Build fields", t);
        }
    }
}
