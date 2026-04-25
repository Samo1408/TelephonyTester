package es.chiteroman.playintegrityfix;

import android.util.Log;
import org.json.JSONObject;
import es.chiteroman.playintegrityfix.bridge.PifBridge;

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
            // Touch PifBridge so the classloader resolves it before the
            // native side calls FindClass(). Pure side-effect, very cheap.
            //noinspection ResultOfMethodCallIgnored
            PifBridge.class.getName();
        } catch (Throwable t) {
            Log.e(TAG, "EntryPoint.init failed", t);
        }
    }
}
