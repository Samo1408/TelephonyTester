-dontobfuscate
-dontwarn *

# Keep EntryPoint and its methods as it's the main entry from native code
-keep class es.chiteroman.playintegrityfix.EntryPoint { *; }

# Keep PifBridge and all its methods because they are called via JNI/Reflection from C++
-keep class es.chiteroman.playintegrityfix.PifBridge { *; }

# Keep HiddenApiBypass
-keep class org.lsposed.hiddenapibypass.** { *; }
