package es.chiteroman.playintegrityfix;

import android.util.Log;
import org.json.JSONObject;

public final class EntryPoint {
    public static final String TAG = "PixelTester";

    public static void init(String deviceJson, String flagsJson) {
        try {
            JSONObject flags = (flagsJson == null || flagsJson.isEmpty())
                    ? new JSONObject() : new JSONObject(flagsJson);
            // Only patch Java Build fields when buildProperties hook is enabled.
            // This keeps Java reflection consistent with the native property hook
            // and prevents partial-state crashes (e.g. apps reading Build.MODEL
            // via reflection while ro.build.model is unspoofed).
            boolean patchBuild = flags.optBoolean("hookBuildProperties", true);
            DeviceHooker.init(deviceJson, patchBuild);
        } catch (Throwable t) {
            Log.e(TAG, "EntryPoint.init failed", t);
        }
    }
}
