package app.unearth.ui.dig

import android.annotation.SuppressLint
import android.content.Context
import android.location.Geocoder
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import app.unearth.data.api.UnearthApi
import app.unearth.data.location.DeviceLocation
import app.unearth.data.model.Category
import app.unearth.data.model.GemDto
import com.google.android.gms.maps.model.LatLng
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

data class TownHit(val name: String, val lat: Double, val lng: Double)

data class DigUi(
    val gems: List<GemDto> = emptyList(),
    val selected: GemDto? = null,
    val center: LatLng = DeviceLocation.fallback,
    val myLocation: LatLng? = null,
    val category: Category? = null,
    val query: String = "",
    val towns: List<TownHit> = emptyList(),
    val loading: Boolean = false,
    val error: String? = null,
    val snackbar: String? = null,
)

@HiltViewModel
class DigViewModel @Inject constructor(
    private val api: UnearthApi,
    @ApplicationContext private val context: Context,
) : ViewModel() {
    private val _ui = MutableStateFlow(DigUi())
    val ui = _ui.asStateFlow()
    private var searchJob: Job? = null

    init {
        viewModelScope.launch { refreshLocation() }
    }

    @SuppressLint("MissingPermission")
    fun refreshLocation() {
        viewModelScope.launch {
            val loc = DeviceLocation.current(context)
            if (loc != null) {
                _ui.update { it.copy(center = loc, myLocation = loc) }
                load(loc)
            } else {
                load(_ui.value.center)
            }
        }
    }

    fun select(gem: GemDto?) { _ui.update { it.copy(selected = gem) } }

    fun selectNewlyUnearthed(gem: GemDto) {
        val ll = LatLng(gem.lat, gem.lng)
        _ui.update {
            it.copy(
                selected = gem,
                center = ll,
                gems = listOf(gem) + it.gems.filter { g -> g.id != gem.id },
            )
        }
    }

    fun setCategory(category: Category?) {
        _ui.update { it.copy(category = category, selected = null) }
        load(_ui.value.center)
    }

    fun clearQuery() {
        searchJob?.cancel()
        _ui.update { it.copy(query = "", towns = emptyList()) }
    }

    fun onCameraSettled(target: LatLng) {
        val cur = _ui.value.center
        val moved = kotlin.math.abs(cur.latitude - target.latitude) > 0.004 ||
            kotlin.math.abs(cur.longitude - target.longitude) > 0.004
        if (!moved) return
        _ui.update { it.copy(center = target) }
        load(target)
    }

    fun onQuery(q: String) {
        _ui.update { it.copy(query = q) }
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            delay(400)
            if (q.length < 2) {
                _ui.update { it.copy(towns = emptyList()) }
                return@launch
            }
            val hits = withContext(Dispatchers.IO) { geocode(q) }
            _ui.update { it.copy(towns = hits) }
        }
    }

    fun goToTown(hit: TownHit) {
        val ll = LatLng(hit.lat, hit.lng)
        _ui.update { it.copy(center = ll, query = hit.name, towns = emptyList()) }
        load(ll)
    }

    fun showSnackbar(msg: String) { _ui.update { it.copy(snackbar = msg) } }
    fun clearSnackbar() { _ui.update { it.copy(snackbar = null) } }

    fun load(center: LatLng = _ui.value.center) {
        viewModelScope.launch {
            _ui.update { it.copy(loading = true, error = null) }
            runCatching {
                api.nearby(center.latitude, center.longitude, 8_000, _ui.value.category?.api)
            }.onSuccess { res ->
                _ui.update { it.copy(gems = res.gems, loading = false) }
            }.onFailure { e ->
                _ui.update { it.copy(loading = false, error = e.message ?: "Couldn’t load gems.") }
            }
        }
    }

    @Suppress("DEPRECATION")
    private fun geocode(q: String): List<TownHit> {
        val geo = Geocoder(context)
        return try {
            geo.getFromLocationName(q, 5).orEmpty().mapNotNull { a ->
                val name = listOfNotNull(a.subLocality, a.locality, a.adminArea).distinct().joinToString(", ")
                if (name.isBlank()) null else TownHit(name, a.latitude, a.longitude)
            }
        } catch (_: Exception) {
            emptyList()
        }
    }
}
