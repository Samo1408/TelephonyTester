package es.chiteroman.playintegrityfix;

  import android.util.Log;
  import org.json.JSONObject;

  public final class EntryPoint {
      public static final String TAG = "PixelTester";

      public static void init(String deviceJson, String flagsJson) {
          try {
              JSONObject flags = (flagsJson == null || flagsJson.isEmpty())
                      ? new JSONObject() : new JSONObject(flagsJson);
              // Initialize device hooker with device properties
              DeviceHooker.init(deviceJson);
          } catch (Throwable t) {
              Log.e(TAG, "EntryPoint.init failed", t);
          }
      }
  }
  
