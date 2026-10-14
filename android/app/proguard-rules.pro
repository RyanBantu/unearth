-keepattributes Signature, InnerClasses, EnclosingMethod, *Annotation*, Exception
-keepattributes RuntimeVisibleAnnotations, RuntimeVisibleParameterAnnotations

-keepclassmembers class kotlinx.serialization.json.** { *; }
-dontwarn kotlinx.serialization.**
-keep,includedescriptorclasses class app.unearth.data.api.**$$serializer { *; }
-keep,includedescriptorclasses class app.unearth.data.model.**$$serializer { *; }
-keepclassmembers @kotlinx.serialization.Serializable class app.unearth.data.api.** {
    *** Companion;
    *** INSTANCE;
    kotlinx.serialization.KSerializer serializer(...);
}
-keepclassmembers @kotlinx.serialization.Serializable class app.unearth.data.model.** {
    *** Companion;
    *** INSTANCE;
    kotlinx.serialization.KSerializer serializer(...);
}

-keep,allowobfuscation,allowshrinking interface retrofit2.Call
-keep,allowobfuscation,allowshrinking class retrofit2.Response
-keep,allowobfuscation,allowshrinking class kotlin.coroutines.Continuation
-dontwarn okhttp3.internal.platform.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**

-keep class com.google.android.gms.** { *; }
-keep class com.google.maps.android.** { *; }
-keep class com.google.android.libraries.places.** { *; }
