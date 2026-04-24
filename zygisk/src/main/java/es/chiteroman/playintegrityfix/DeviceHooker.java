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

        // Patch cached Java fields
        patchBuildFields();
    }

    private static String s(String k) { 
        return values.get(k); 
    }

    private static void setStaticField(Class<?> cls, String fieldName, Object value) {
        if (value == null) return;
        try {
            Field f = cls.getDeclaredField(fieldName);
            f.setAccessible(true);
            
            // Remove final modifier if necessary
            try {
                Field modifiersField = Field.class.getDeclaredField("accessFlags");
                modifiersField.setAccessible(true);
                modifiersField.setInt(f, f.getModifiers() & ~Modifier.FINAL);
            } catch (Throwable ignored) {}

            f.set(null, value);
            Log.d(TAG, cls.getSimpleName() + "." + fieldName + " patched to " + value);
        } catch (Throwable ignored) {}
    }

    private static void patchBuildFields() {
        try {
            Class<?> b = Class.forName("android.os.Build");
            
            setStaticField(b, "BRAND", s("brand"));
            setStaticField(b, "MANUFACTURER", s("manufacturer"));
            setStaticField(b, "MODEL", s("model"));
            setStaticField(b, "PRODUCT", s("productName"));
            setStaticField(b, "DEVICE", s("deviceCode"));
            setStaticField(b, "BOARD", s("board"));
            setStaticField(b, "HARDWARE", s("hardware"));
            setStaticField(b, "FINGERPRINT", s("buildFingerprint"));
            setStaticField(b, "ID", s("buildId"));
            setStaticField(b, "DISPLAY", s("buildDisplayId"));
            setStaticField(b, "BOOTLOADER", s("bootloader"));
            
            Class<?> v = Class.forName("android.os.Build$VERSION");
            setStaticField(v, "INCREMENTAL", s("buildIncremental"));
            setStaticField(v, "RELEASE", s("buildRelease"));
            setStaticField(v, "SECURITY_PATCH", s("securityPatch"));
            
            try {
                int sdk = Integer.parseInt(s("buildSdk"));
                setStaticField(v, "SDK_INT", sdk);
            } catch (Throwable ignored) {}

            Log.i(TAG, "Build fields patched successfully");
        } catch (Throwable t) {
            Log.e(TAG, "Failed to patch Build fields", t);
        }
    }
}
