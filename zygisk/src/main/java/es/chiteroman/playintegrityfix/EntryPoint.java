package es.chiteroman.playintegrityfix;

import android.util.Log;
import org.json.JSONObject;

public final class EntryPoint {
    public static final String TAG = "PixelTester";

    public static void init(String deviceJson, String flagsJson) {
        try {
            JSONObject flags = (flagsJson == null || flagsJson.isEmpty())
                    ? new JSONObject() : new JSONObject(flagsJson);
            // Forward the full flags object to DeviceHooker so it can gate
            // each identity hook independently. Build-property patching is
            // still the master switch for static Build/VERSION reflection.
            DeviceHooker.init(deviceJson, flags);
        } catch (Throwable t) {
            Log.e(TAG, "EntryPoint.init failed", t);
        }
    }
}
