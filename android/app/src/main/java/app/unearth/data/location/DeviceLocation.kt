package app.unearth.data.location

import android.annotation.SuppressLint
import android.content.Context
import android.os.Build
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.maps.model.LatLng
import kotlin.math.abs
import kotlinx.coroutines.tasks.await

object DeviceLocation {
    /** Manipal — same fallback Dig uses when GPS isn’t available yet. */
    val fallback = LatLng(13.351, 74.786)

    fun isEmulator(): Boolean {
        val fingerprint = Build.FINGERPRINT
        val model = Build.MODEL
        val product = Build.PRODUCT
        val hardware = Build.HARDWARE
        return fingerprint.startsWith("generic") ||
            fingerprint.contains("emulator") ||
            model.contains("Emulator") ||
            model.contains("Android SDK") ||
            product.contains("sdk_gphone") ||
            product.contains("sdk_google") ||
            product.contains("emulator") ||
            hardware.contains("goldfish") ||
            hardware.contains("ranchu")
    }

    /**
     * Android emulator and Google Maps both default to Googleplex
     * (Mountain View / Palo Alto). Treat that as “no location yet”.
     */
    fun isStub(lat: Double, lng: Double): Boolean {
        val googleplex = abs(lat - 37.4219989) < 0.03 && abs(lng + 122.0840575) < 0.03
        val paloAlto = abs(lat - 37.4419) < 0.03 && abs(lng + 122.1430) < 0.03
        return googleplex || paloAlto
    }

    fun usable(lat: Double, lng: Double): Boolean {
        if (!isEmulator()) return true
        return !isStub(lat, lng)
    }

    @SuppressLint("MissingPermission")
    suspend fun current(context: Context): LatLng? {
        val client = LocationServices.getFusedLocationProviderClient(context)
        val last = runCatching { client.lastLocation.await() }.getOrNull()
        if (last != null && usable(last.latitude, last.longitude)) {
            return LatLng(last.latitude, last.longitude)
        }
        val fresh = runCatching {
            client.getCurrentLocation(Priority.PRIORITY_HIGH_ACCURACY, null).await()
        }.getOrNull()
        if (fresh != null && usable(fresh.latitude, fresh.longitude)) {
            return LatLng(fresh.latitude, fresh.longitude)
        }
        return null
    }
}
