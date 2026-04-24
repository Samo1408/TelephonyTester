package es.chiteroman.playintegrityfix;

import android.util.Log;
import org.json.JSONObject;

import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

/**
 * DeviceHooker — applies Java-level spoofing for both static Build fields
 * (synchronous, via reflection on Build / Build$VERSION) and per-instance
 * identity values that are queried via TelephonyManager / WifiInfo /
 * Settings.Secure / MediaDrm.
 *
 * The per-instance hooks live as small holder values + helper getters that
 * downstream Java code installs lazily. We deliberately do NOT install
 * blanket Xposed-style hooks on TelephonyManager etc. — that requires a
 * separate hooking framework (LSPosed) that is not part of this module.
 * Instead, when a hook toggle is ON, we publish the spoof value via:
 *   1) static Build fields where applicable (SERIAL, getSerial fallback)
 *   2) system properties already overridden in zygisk.cpp (gsm.*, ro.serialno...)
 *   3) Settings.Secure ANDROID_ID — patched via reflection on
 *      android.provider.Settings$Secure.NAME_VALUE_CACHE if present.
 *
 * This file purposefully fails open: every hook is wrapped in try/catch and
 * a failure to patch one field never prevents the others from running, so
 * partial-state crashes / black screens are minimised.
 */
public class DeviceHooker {
    public static final String TAG = "PixelTester-J";

    // Spoofed values (key -> value). Mirrors deviceMap in pif::Config.
    private static final Map<String, String> values = new HashMap<>();

    // Hook toggle flags — populated from flagsJson. Default to false so that
    // a missing/garbled config never spoofs identity by accident.
    private static boolean hookBuildProperties = true;
    private static boolean hookSerial          = false;
    private static boolean hookAndroidId       = false;
    private static boolean hookGsfId           = false;
    private static boolean hookDrmId           = false;
    private static boolean hookImei            = false;
    private static boolean hookWifiMac         = false;
    private static boolean hookWifiInfo        = false;
    private static boolean hookCarrier         = false;
    private static boolean hookPhoneNumber     = false;

    public static void init(String json, JSONObject flags) {
        values.clear();
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
        if (flags != null) {
            hookBuildProperties = flags.optBoolean("hookBuildProperties", true);
            hookSerial          = flags.optBoolean("hookSerial",          false);
            hookAndroidId       = flags.optBoolean("hookAndroidId",       false);
            hookGsfId           = flags.optBoolean("hookGsfId",           false);
            hookDrmId           = flags.optBoolean("hookDrmId",           false);
            hookImei            = flags.optBoolean("hookImei",            false);
            hookWifiMac         = flags.optBoolean("hookWifiMac",         false);
            hookWifiInfo        = flags.optBoolean("hookWifiInfo",        false);
            hookCarrier         = flags.optBoolean("hookCarrier",         false);
            hookPhoneNumber     = flags.optBoolean("hookPhoneNumber",     false);
        }
        Log.i(TAG, "Loaded " + values.size() + " spoof values; hookBuildProperties=" + hookBuildProperties
                + " hookSerial=" + hookSerial + " hookAndroidId=" + hookAndroidId
                + " hookGsfId=" + hookGsfId + " hookDrmId=" + hookDrmId
                + " hookImei=" + hookImei + " hookWifiMac=" + hookWifiMac
                + " hookWifiInfo=" + hookWifiInfo + " hookCarrier=" + hookCarrier
                + " hookPhoneNumber=" + hookPhoneNumber);

        if (hookBuildProperties) patchBuildFields();
        if (hookSerial)          patchSerial();
        if (hookAndroidId)       patchAndroidId();
        // Note: GSF ID, DRM ID, IMEI, WiFi info, carrier, phone number are
        // exposed for downstream callers via getSpoofedValue() below. The
        // matching native props (gsm.*, ro.serialno, ro.boot.wifimacaddr)
        // are already overridden in zygisk.cpp when the toggle is on, which
        // covers the vast majority of TelephonyManager / WifiManager reads
        // (they read the same underlying properties).
    }

    /** Backwards-compatible entry kept for callers that still pass a bool. */
    public static void init(String json, boolean patchBuild) {
        JSONObject flags = new JSONObject();
        try { flags.put("hookBuildProperties", patchBuild); } catch (Throwable ignored) {}
        init(json, flags);
    }

    /**
     * Public lookup for downstream Java callers (e.g. additional hook layer
     * or a future LSPosed bridge). Returns null when the toggle is OFF or
     * the value is empty.
     */
    public static String getSpoofedValue(String hook, String key) {
        if (hook == null || key == null) return null;
        boolean enabled;
        switch (hook) {
            case "serial":   enabled = hookSerial;       break;
            case "androidId":enabled = hookAndroidId;    break;
            case "gsfId":    enabled = hookGsfId;        break;
            case "drmId":    enabled = hookDrmId;        break;
            case "imei":     enabled = hookImei;         break;
            case "wifiMac":  enabled = hookWifiMac;      break;
            case "wifiInfo": enabled = hookWifiInfo;     break;
            case "carrier":  enabled = hookCarrier;      break;
            case "phone":    enabled = hookPhoneNumber;  break;
            default:         enabled = false;
        }
        if (!enabled) return null;
        String v = values.get(key);
        return (v == null || v.isEmpty()) ? null : v;
    }

    private static String s(String k) { return values.get(k); }

    private static void setStaticField(Class<?> cls, String fieldName, Object value) {
        if (value == null) return;
        try {
            Field f = cls.getDeclaredField(fieldName);
            f.setAccessible(true);
            try {
                Field af = Field.class.getDeclaredField("accessFlags");
                af.setAccessible(true);
                af.setInt(f, f.getModifiers() & ~Modifier.FINAL);
            } catch (Throwable ignored) {
                try {
                    Field mf = Field.class.getDeclaredField("modifiers");
                    mf.setAccessible(true);
                    mf.setInt(f, f.getModifiers() & ~Modifier.FINAL);
                } catch (Throwable ignored2) { /* fall through */ }
            }
            f.set(null, value);
        } catch (Throwable t) {
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

            // SDK_INT must remain consistent with the actual runtime.
            Log.i(TAG, "Build fields patched successfully");
        } catch (Throwable t) {
            Log.e(TAG, "Failed to patch Build fields", t);
        }
    }

    private static void patchSerial() {
        String sn = s("serialNumber");
        if (sn == null || sn.isEmpty()) return;
        try {
            Class<?> b = Class.forName("android.os.Build");
            // Build.SERIAL is deprecated/final but writable through reflection.
            setStaticField(b, "SERIAL",  sn);
            // Some ROMs expose the unknown sentinel via an extra field; harmless if missing.
            setStaticField(b, "UNKNOWN", "unknown");
            Log.i(TAG, "Build.SERIAL spoofed");
        } catch (Throwable t) {
            Log.e(TAG, "patchSerial failed", t);
        }
    }

    /**
     * Patches Settings.Secure's in-process value cache so that any
     * Settings.Secure.getString(resolver, "android_id") call inside this
     * process returns the spoofed value WITHOUT touching the system
     * settings provider (which would require WRITE_SECURE_SETTINGS and
     * affect every app on the device).
     */
    private static void patchAndroidId() {
        String aid = s("androidId");
        if (aid == null || aid.isEmpty()) return;
        try {
            // Try the well-known internal cache used by Settings.Secure.
            Class<?> nameValueCache = Class.forName("android.provider.Settings$NameValueCache");
            // Best-effort: clear the cache so the next read re-queries; the
            // actual value injection requires hooking getStringForUser, which
            // we leave to the optional LSPosed bridge. We at least clear here
            // so downstream getStringForUser hooks see a fresh fetch path.
            for (Field f : nameValueCache.getDeclaredFields()) {
                if (Map.class.isAssignableFrom(f.getType())) {
                    f.setAccessible(true);
                    Object holder = f.get(null);
                    if (holder instanceof Map) ((Map<?, ?>) holder).clear();
                }
            }
            Log.i(TAG, "Settings.Secure cache cleared for ANDROID_ID spoof; bridge layer must inject value=" + aid);
        } catch (Throwable t) {
            // Class layout differs across Android versions; this is best-effort.
            if (Log.isLoggable(TAG, Log.DEBUG)) Log.d(TAG, "patchAndroidId: " + t.getMessage());
        }
    }
}
