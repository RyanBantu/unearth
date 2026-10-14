package app.unearth

import android.app.Application
import com.google.android.libraries.places.api.Places
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class UnearthApp : Application() {
    override fun onCreate() {
        super.onCreate()
        val key = BuildConfig.MAPS_API_KEY
        if (key.isNotBlank() && key != "YOUR_MAPS_API_KEY" && !Places.isInitialized()) {
            Places.initializeWithNewPlacesApiEnabled(this, key)
        }
    }
}
