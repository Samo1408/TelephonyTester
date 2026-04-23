package es.chiteroman.playintegrityfix;

import android.util.Log;
import org.json.JSONObject;

import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Locale;
import java.util.Map;

/**
 * Java-side telephony spoof helpers.
 *
 * The bulk of the spoofing is done in native code by intercepting
 * __system_property_read_callback. That single hook is what fakes the
 * values returned by the Suppliers in:
 *   - android.sysprop.TelephonyProperties
 *       icc_operator_numeric / icc_operator_iso_country / icc_operator_alpha
 *       operator_numeric    / operator_iso_country     / operator_alpha
 *       (and their lambda$ cached suppliers)
 *   - com.samsung.telephony.sysprop.SemTelephonyProps
 *       same getters but reading the Samsung "ril.*" / "ro.csc.*" props
 *
 * On top of that we patch a few cached Java fields here so that values
 * that were already snapshotted before the property hook was installed
 * are still replaced.
 */
public class TelephonyHooker {
    public static final String TAG = "TeleInject-J";
    private static final Map<String, String> values = new HashMap<>();

    public static void init(String json, boolean hookTM, boolean hookSI,
                            boolean hookEN, boolean hookUL, boolean hookCI) {
        if (json == null || json.isEmpty()) {
            Log.i(TAG, "No telephony configuration provided");
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
            Log.e(TAG, "Failed to parse telephony config", e);
            return;
        }
        Log.i(TAG, "Loaded " + values.size() + " spoof values");

        if (hookTM) hookTelephonyManager();
        if (hookSI) hookSubscriptionInfo();
        if (hookEN) hookEmergencyNumber();
        clearSyspropCaches();      // android.sysprop.TelephonyProperties + Samsung
        // ULocale hook is intentionally non-invasive to avoid framework/ICU force-closes
        if (hookUL) hookULocale();
        if (hookCI) hookCellIdentity();
    }

    /**
     * android.telephony.CellIdentity{,Gsm,Lte,Wcdma,Tdscdma,Nr,Cdma}.
     * These are immutable data classes whose getters
     *   getMccString / getMncString / getMobileNetworkOperator /
     *   getOperatorAlphaShort / getOperatorAlphaLong / getPlmn
     * return values stored in private final-ish fields:
     *   mMccStr, mMncStr, mAlphaShort, mAlphaLong, mPlmn
     */
    private static final String[] CELL_IDENTITY_CLASSES = {
        "android.telephony.CellIdentity",
        "android.telephony.CellIdentityGsm",
        "android.telephony.CellIdentityLte",
        "android.telephony.CellIdentityWcdma",
        "android.telephony.CellIdentityTdscdma",
        "android.telephony.CellIdentityNr",
        "android.telephony.CellIdentityCdma",
    };

    private static void hookCellIdentity() {
        String mcc    = s("MCC_STRING"); if (mcc == null) mcc = s("MCC");
        String mnc    = s("MNC_STRING"); if (mnc == null) mnc = s("MNC");
        String alphaL = s("OPERATOR_NAME");
        String alphaS = s("OPERATOR_NAME");
        String plmn   = (mcc != null && mnc != null) ? (mcc + mnc) : s("OPERATOR_NUMERIC");

        // FIX 4: parse mcc/mnc integers here and actually use them in setField below
        Integer mccInt = null, mncInt = null;
        try { if (mcc != null) mccInt = Integer.parseInt(mcc); } catch (Exception ignored) {}
        try { if (mnc != null) mncInt = Integer.parseInt(mnc); } catch (Exception ignored) {}

        for (String cn : CELL_IDENTITY_CLASSES) {
            try {
                Class<?> cls = Class.forName(cn);
                int touched = 0;

                // Clear any static cached default instances
                for (Field f : cls.getDeclaredFields()) {
                    if ((f.getModifiers() & Modifier.STATIC) == 0) continue;
                    String n = f.getName().toLowerCase(Locale.ROOT);
                    if (n.contains("default") || n.contains("cache")) {
                        try {
                            f.setAccessible(true);
                            f.set(null, null);
                            touched++;
                        } catch (Throwable ignored) {}
                    }
                }

                // FIX 4 (continued): actually apply integer mcc/mnc to static fields
                // on legacy classes that store them as ints (e.g. older CellIdentityGsm)
                if (mccInt != null) setStaticField(cls, "mMcc", mccInt);
                if (mncInt != null) setStaticField(cls, "mMnc", mncInt);

                Log.d(TAG, cn + ": cleared " + touched
                        + " static field(s); spoof mcc=" + mcc
                        + " mnc=" + mnc + " plmn=" + plmn
                        + " alpha=" + alphaL);
            } catch (ClassNotFoundException ignored) {
                // not present on this Android version (e.g. CellIdentityNr on <Q)
            } catch (Throwable t) {
                Log.e(TAG, "hookCellIdentity " + cn, t);
            }
        }
    }

    /**
     * Patch a single CellIdentity instance with the spoofed values.
     * Can be called by other hook integrations.
     */
    public static void patchCellIdentity(Object cellIdentity) {
        if (cellIdentity == null) return;
        String mcc    = s("MCC_STRING"); if (mcc == null) mcc = s("MCC");
        String mnc    = s("MNC_STRING"); if (mnc == null) mnc = s("MNC");
        String alphaL = s("OPERATOR_NAME");
        String alphaS = s("OPERATOR_NAME");
        String plmn   = (mcc != null && mnc != null) ? (mcc + mnc) : s("OPERATOR_NUMERIC");

        Class<?> cls = cellIdentity.getClass();
        if (mcc    != null) setField(cls, cellIdentity, "mMccStr",    mcc);
        if (mnc    != null) setField(cls, cellIdentity, "mMncStr",    mnc);
        if (alphaS != null) setField(cls, cellIdentity, "mAlphaShort", alphaS);
        if (alphaL != null) setField(cls, cellIdentity, "mAlphaLong",  alphaL);
        if (plmn   != null) setField(cls, cellIdentity, "mPlmn",      plmn);
        try {
            if (mcc != null) setField(cls, cellIdentity, "mMcc", Integer.parseInt(mcc));
            if (mnc != null) setField(cls, cellIdentity, "mMnc", Integer.parseInt(mnc));
        } catch (Throwable ignored) {}
    }

    private static String s(String k) { return values.get(k); }

    private static Field findField(Class<?> cls, String name) {
        Class<?> c = cls;
        while (c != null && c != Object.class) {
            try { return c.getDeclaredField(name); }
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

    /** Set a static field on a class (best-effort, ignores failure). */
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

    /**
     * android.sysprop.TelephonyProperties / SemTelephonyProps cache
     * each getter's result in a static Optional-typed field whose name
     * matches the getter. Null them so the next call re-reads the
     * (now hooked) system property.
     */
    private static final String[] SYSPROP_CACHE_FIELDS = {
        // android.sysprop.TelephonyProperties getters
        "icc_operator_numeric", "icc_operator_iso_country", "icc_operator_alpha",
        "operator_numeric", "operator_iso_country", "operator_alpha",
        // The Suppliers used internally are stored as lambda$ fields.
        "lambda$icc_operator_numeric$7", "lambda$icc_operator_iso_country$9",
        "lambda$icc_operator_alpha$8",
        "lambda$operator_numeric$0", "lambda$operator_iso_country$2",
        "lambda$operator_alpha$1",
    };

    private static void clearSyspropCaches() {
        clearStaticFields("android.sysprop.TelephonyProperties", SYSPROP_CACHE_FIELDS);
        clearStaticFields("com.samsung.telephony.sysprop.SemTelephonyProps", SYSPROP_CACHE_FIELDS);
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
            // also brute-force any *Optional* / *Supplier* static field on the class
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
            // class not present on this device (e.g. SemTelephonyProps on non-Samsung)
        } catch (Throwable t) {
            Log.e(TAG, "clearStaticFields " + className, t);
        }
    }

    private static void hookTelephonyManager() {
        try {
            Class<?> tm = Class.forName("android.telephony.TelephonyManager");
            for (String f : new String[]{"sCachedCountryIso", "sCachedNetworkOperator",
                    "sCachedSimOperator", "sCachedSimOperatorName"}) {
                try {
                    Field cf = tm.getDeclaredField(f);
                    cf.setAccessible(true);
                    cf.set(null, null);
                } catch (Throwable ignored) {}
            }
            Log.i(TAG, "TelephonyManager caches cleared");
        } catch (Throwable t) {
            Log.e(TAG, "hookTelephonyManager", t);
        }
    }

    private static void hookSubscriptionInfo() {
        // FIX 5: added correct field names used across AOSP versions and cleared Map properly
        try {
            Class<?> sm = Class.forName("android.telephony.SubscriptionManager");
            // Field names vary by Android version — try all known variants
            for (String f : new String[]{
                    "sCacheActiveList",      // AOSP < 12
                    "sCacheAllList",         // AOSP < 12
                    "sActiveSubInfoList",    // AOSP 12+
                    "sAllSubInfoList",       // AOSP 12+
                    "sSubInfoCacheMap",      // some OEM variants
                    "mSubInfoLocalCache",    // older OEM variants
                    "sAvailableSubInfoList"  // additional variant
            }) {
                try {
                    Field cf = findField(sm, f);
                    if (cf == null) continue;
                    cf.setAccessible(true);
                    Object cur = cf.get(null);
                    if (cur instanceof Map) {
                        ((Map<?, ?>) cur).clear();
                    } else if (cur != null) {
                        // It's a List or other collection — null it out
                        cf.set(null, null);
                    }
                } catch (Throwable ignored) {}
            }
            Log.i(TAG, "SubscriptionInfo cache cleared");
        } catch (Throwable t) {
            Log.e(TAG, "hookSubscriptionInfo", t);
        }
    }

    private static void hookEmergencyNumber() {
        try {
            Class<?> en = Class.forName("android.telephony.emergency.EmergencyNumber");
            String iso = s("COUNTRY_ISO");
            if (iso != null) {
                for (String f : new String[]{"mCountryIso", "sDefaultCountryIso"}) {
                    setField(en, null, f, iso);
                }
            }
            try {
                Class<?> tracker = Class.forName(
                        "com.android.internal.telephony.emergency.EmergencyNumberTracker");
                if (iso != null) setField(tracker, null,
                        "mLastKnownEmergencyCountryIso", iso);
            } catch (Throwable ignored) {}
            Log.i(TAG, "EmergencyNumber patched");
        } catch (Throwable t) {
            Log.e(TAG, "hookEmergencyNumber", t);
        }
    }

    /**
     * Keep ULocale safe.
     *
     * Do not mutate android.icu.util.ULocale internals or Locale defaults from
     * inside target apps. Several Android/ICU builds keep static final sentinels
     * and shared caches in this class; clearing them can break framework code and
     * force-close apps. Telephony country spoofing is handled through the system
     * property hook, while this toggle is retained as a non-invasive hook point.
     */
    private static void hookULocale() {
        String iso = s("COUNTRY_ISO");
        if (iso == null || iso.isEmpty()) iso = s("NETWORK_COUNTRY_ISO");
        if (iso == null || iso.isEmpty()) iso = s("SIM_COUNTRY_ISO");
        Log.i(TAG, "ULocale hook enabled safely; framework locale left unchanged"
                + (iso == null || iso.isEmpty() ? "" : " (country=" + iso.toUpperCase(Locale.ROOT) + ")"));
    }
}
