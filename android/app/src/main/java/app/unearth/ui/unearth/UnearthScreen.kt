package app.unearth.ui.unearth

import android.net.Uri
import androidx.activity.compose.BackHandler
import androidx.browser.customtabs.CustomTabsIntent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.automirrored.rounded.OpenInNew
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.unearth.data.api.CreateFindBody
import app.unearth.data.api.CreateGemBody
import app.unearth.data.api.UnearthApi
import app.unearth.data.api.parseApiError
import app.unearth.data.location.DeviceLocation
import app.unearth.data.model.AllowedTags
import app.unearth.data.model.Category
import app.unearth.data.model.GemDto
import app.unearth.data.model.MatchCandidateDto
import app.unearth.data.model.formatDistance
import app.unearth.data.model.isValidGoogleMapsUrl
import app.unearth.ui.components.CategoryChip
import app.unearth.ui.components.PrimaryButton
import app.unearth.ui.components.UnearthChip
import app.unearth.ui.components.UnearthField
import app.unearth.ui.theme.Bricolage
import app.unearth.ui.theme.DmSans
import app.unearth.ui.theme.UnearthColor
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.android.libraries.places.api.Places
import com.google.android.libraries.places.api.model.AutocompleteSessionToken
import com.google.android.libraries.places.api.model.RectangularBounds
import com.google.android.libraries.places.api.net.FindAutocompletePredictionsRequest
import com.google.maps.android.compose.CameraMoveStartedReason
import com.google.maps.android.compose.GoogleMap
import com.google.maps.android.compose.MapUiSettings
import com.google.maps.android.compose.rememberCameraPositionState
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import retrofit2.HttpException

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun UnearthScreen(
    api: UnearthApi,
    existingGemId: String?,
    existingGemName: String? = null,
    initialLocation: LatLng? = null,
    onClose: () -> Unit,
    onDone: (snackbar: String, gem: GemDto?) -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var name by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var liked by remember { mutableStateOf("") }
    var disliked by remember { mutableStateOf("") }
    var maps by remember { mutableStateOf("") }
    var category by remember { mutableStateOf<Category?>(null) }
    var more by remember { mutableStateOf(false) }
    var tags by remember { mutableStateOf(setOf<String>()) }
    var pin by remember { mutableStateOf(initialLocation ?: DeviceLocation.fallback) }
    var suggestions by remember { mutableStateOf<List<Pair<String, String>>>(emptyList()) }
    var googlePlaceId by remember { mutableStateOf<String?>(null) }
    var linkedId by remember { mutableStateOf(existingGemId) }
    var linkedName by remember { mutableStateOf(existingGemName) }
    var match by remember { mutableStateOf<MatchCandidateDto?>(null) }
    var dismissedIds by remember { mutableStateOf(setOf<String>()) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val camera = rememberCameraPositionState { position = CameraPosition.fromLatLngZoom(pin, 16f) }
    val sessionToken = remember { AutocompleteSessionToken.newInstance() }
    val descLen = description.trim().length
    val descValid = descLen in 10..600
    val mapsValid = isValidGoogleMapsUrl(maps)
    val hints = buildList {
        if (linkedId == null) {
            if (name.isBlank()) add("Add a name")
            if (category == null) add("Pick a category")
        }
        if (!descValid) {
            add(if (descLen < 10) "“Why it's a gem” needs at least 10 characters ($descLen/10)" else "“Why it's a gem” is too long (max 600)")
        }
        if (!mapsValid) add("Google Maps link isn’t a valid Maps URL")
    }
    val formValid = hints.isEmpty()

    BackHandler { onClose() }

    fun useMyLocation() {
        scope.launch {
            val loc = DeviceLocation.current(context) ?: initialLocation ?: return@launch
            pin = loc
            camera.position = CameraPosition.fromLatLngZoom(loc, 16f)
        }
    }

    LaunchedEffect(Unit) { useMyLocation() }

    LaunchedEffect(name, pin) {
        if (name.length < 3) {
            suggestions = emptyList()
            return@LaunchedEffect
        }
        delay(300)
        if (!Places.isInitialized()) return@LaunchedEffect
        runCatching {
            val client = Places.createClient(context)
            val d = 0.018
            val req = FindAutocompletePredictionsRequest.builder()
                .setQuery(name)
                .setSessionToken(sessionToken)
                .setLocationBias(
                    RectangularBounds.newInstance(
                        LatLng(pin.latitude - d, pin.longitude - d),
                        LatLng(pin.latitude + d, pin.longitude + d),
                    ),
                )
                .build()
            client.findAutocompletePredictions(req).await().autocompletePredictions
                .take(4)
                .map { it.getPrimaryText(null).toString() to it.placeId }
        }.onSuccess { suggestions = it }.onFailure { suggestions = emptyList() }
    }

    LaunchedEffect(name, category, pin, googlePlaceId, linkedId) {
        val cat = category
        if (name.length < 3 || linkedId != null || cat == null) {
            match = null
            return@LaunchedEffect
        }
        delay(400)
        runCatching {
            api.match(pin.latitude, pin.longitude, name, cat.api, googlePlaceId)
        }.onSuccess { match = it.candidates.firstOrNull { c -> c.id !in dismissedIds } }
            .onFailure { /* keep last match */ }
    }

    Column(Modifier.fillMaxSize().background(UnearthColor.FormBackground).statusBarsPadding()) {
        Row(
            Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                "Cancel",
                color = UnearthColor.Green,
                fontFamily = DmSans,
                fontWeight = FontWeight.Medium,
                fontSize = 16.sp,
                modifier = Modifier.clickable(onClick = onClose).padding(8.dp),
            )
            Spacer(Modifier.weight(1f))
            Text(
                if (linkedId != null) "I found it too" else "Unearth a gem",
                fontFamily = Bricolage,
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp,
                color = UnearthColor.Ink,
            )
            Spacer(Modifier.weight(1f))
            Spacer(Modifier.size(64.dp))
        }
        Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 14.dp)) {
            if (linkedId != null) {
                Column(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(18.dp))
                        .background(UnearthColor.Surface)
                        .border(1.dp, UnearthColor.Border, RoundedCornerShape(18.dp))
                        .padding(14.dp),
                ) {
                    Text("Adding your find", fontFamily = DmSans, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = UnearthColor.InkSecondary)
                    Text(linkedName ?: name, fontFamily = Bricolage, fontWeight = FontWeight.Bold, fontSize = 18.sp, color = UnearthColor.Ink)
                }
            } else {
                Column(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(18.dp))
                        .background(UnearthColor.Surface)
                        .border(1.dp, UnearthColor.Border, RoundedCornerShape(18.dp)),
                ) {
                    Box(Modifier.fillMaxWidth().height(112.dp)) {
                        GoogleMap(
                            modifier = Modifier.fillMaxSize(),
                            cameraPositionState = camera,
                            uiSettings = MapUiSettings(zoomControlsEnabled = false, mapToolbarEnabled = false),
                            onMapLoaded = {
                                camera.move(CameraUpdateFactory.newLatLngZoom(pin, 16f))
                            },
                        )
                        Box(Modifier.align(Alignment.Center).background(UnearthColor.Green).padding(6.dp)) {
                            Text("◆", color = UnearthColor.Surface)
                        }
                    }
                    LaunchedEffect(camera.isMoving) {
                        if (!camera.isMoving && camera.cameraMoveStartedReason == CameraMoveStartedReason.GESTURE) {
                            pin = camera.position.target
                        }
                    }
                    Row(
                        Modifier.padding(horizontal = 12.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text("Drag the map to adjust the pin", fontFamily = DmSans, fontSize = 13.sp, color = UnearthColor.InkSecondary, modifier = Modifier.weight(1f))
                        Text(
                            "Use my location",
                            color = UnearthColor.Green,
                            fontFamily = DmSans,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 13.sp,
                            modifier = Modifier
                                .clip(RoundedCornerShape(10.dp))
                                .background(UnearthColor.GreenTint)
                                .clickable { useMyLocation() }
                                .padding(horizontal = 12.dp, vertical = 8.dp),
                        )
                    }
                }
                Spacer(Modifier.height(14.dp))
                Text("Name", fontFamily = DmSans, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = UnearthColor.Ink)
                UnearthField(name, { name = it; googlePlaceId = null }, "Name this gem")
                if (suggestions.isNotEmpty() && name.isNotEmpty()) {
                    Column(
                        Modifier
                            .padding(top = 6.dp)
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(14.dp))
                            .background(UnearthColor.Surface)
                            .border(1.dp, UnearthColor.FieldBorder, RoundedCornerShape(14.dp)),
                    ) {
                        suggestions.forEach { (label, placeId) ->
                            Text(
                                label,
                                Modifier.fillMaxWidth().clickable { name = label; googlePlaceId = placeId; suggestions = emptyList() }.padding(horizontal = 14.dp, vertical = 10.dp),
                                fontFamily = DmSans,
                                color = UnearthColor.Ink,
                            )
                        }
                    }
                }
                match?.let { m ->
                    Spacer(Modifier.height(12.dp))
                    Column(
                        Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(16.dp))
                            .background(UnearthColor.AmberTint)
                            .padding(12.dp),
                    ) {
                        Text("Is this the same place?", fontFamily = DmSans, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = UnearthColor.AmberDeep)
                        Text(
                            "${m.name} · ${formatDistance(m.distanceM)} from your pin · ${m.findCount} ${if (m.findCount == 1) "find" else "finds"}",
                            fontFamily = DmSans,
                            fontSize = 13.sp,
                            color = UnearthColor.AmberDeep,
                        )
                        Spacer(Modifier.height(10.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Text(
                                "Yes, I found it too",
                                modifier = Modifier
                                    .weight(1f)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(UnearthColor.Amber)
                                    .clickable {
                                        linkedId = m.id
                                        linkedName = m.name
                                        name = m.name
                                        category = Category.fromApi(m.category)
                                        match = null
                                    }
                                    .padding(vertical = 10.dp),
                                color = UnearthColor.Surface,
                                fontFamily = DmSans,
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 14.sp,
                            )
                            Text(
                                "No, it's different",
                                modifier = Modifier
                                    .weight(1f)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(UnearthColor.AmberTint)
                                    .border(1.5.dp, UnearthColor.Amber, RoundedCornerShape(12.dp))
                                    .clickable {
                                        dismissedIds = dismissedIds + m.id
                                        match = null
                                    }
                                    .padding(vertical = 10.dp),
                                color = UnearthColor.Amber,
                                fontFamily = DmSans,
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 14.sp,
                            )
                        }
                    }
                }
            }
            Spacer(Modifier.height(14.dp))
            Text("Category", fontFamily = DmSans, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = UnearthColor.Ink)
            if (category == null && linkedId == null) {
                Text("Required — pick one to enable Unearth", fontFamily = DmSans, fontSize = 13.sp, color = UnearthColor.Amber)
            }
            Spacer(Modifier.height(6.dp))
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf(Category.Food, Category.Cafe, Category.Viewpoint, Category.Trail).forEach {
                    CategoryChip(it, category == it, form = true) { category = it }
                }
                if (more) {
                    CategoryChip(Category.Shop, category == Category.Shop, form = true) { category = Category.Shop }
                    CategoryChip(Category.Other, category == Category.Other, form = true) { category = Category.Other }
                } else {
                    UnearthChip("More", false) { more = true }
                }
            }
            Spacer(Modifier.height(14.dp))
            Row(
                Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp))
                    .background(UnearthColor.GreenTint)
                    .clickable {
                        CustomTabsIntent.Builder().build().launchUrl(context, Uri.parse("https://unearth-1o4a.onrender.com/guidelines"))
                    }
                    .padding(12.dp),
                verticalAlignment = Alignment.Top,
            ) {
                Icon(Icons.Outlined.Info, contentDescription = null, tint = UnearthColor.Green, modifier = Modifier.size(20.dp))
                Spacer(Modifier.size(10.dp))
                Column(Modifier.weight(1f)) {
                    Text("Public places only", fontFamily = DmSans, fontWeight = FontWeight.SemiBold, color = UnearthColor.Ink)
                    Text("Read posting guidelines before you Unearth.", fontFamily = DmSans, fontSize = 13.sp, color = UnearthColor.InkSecondary)
                }
                Icon(Icons.AutoMirrored.Rounded.OpenInNew, contentDescription = null, tint = UnearthColor.Green, modifier = Modifier.size(14.dp))
            }
            Spacer(Modifier.height(14.dp))
            Text("Why it's a gem", fontFamily = DmSans, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = UnearthColor.Ink)
            Text(
                "Required · at least 10 characters",
                fontFamily = DmSans,
                fontSize = 13.sp,
                color = if (descValid) UnearthColor.InkSecondary else UnearthColor.Amber,
            )
            Spacer(Modifier.height(6.dp))
            UnearthField(description, { description = it }, "What is it, what to try, when to go", singleLine = false, minHeight = 88.dp)
            Spacer(Modifier.height(14.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Column(Modifier.weight(1f)) {
                    Text("Liked", fontFamily = DmSans, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = UnearthColor.Green)
                    Spacer(Modifier.height(6.dp))
                    UnearthField(liked, { if (it.length <= 140) liked = it }, "The good bits")
                }
                Column(Modifier.weight(1f)) {
                    Text("Didn't like", fontFamily = DmSans, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = UnearthColor.Amber)
                    Spacer(Modifier.height(6.dp))
                    UnearthField(disliked, { if (it.length <= 140) disliked = it }, "Heads-ups")
                }
            }
            Spacer(Modifier.height(14.dp))
            Text("Tags", fontFamily = DmSans, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = UnearthColor.Ink)
            Spacer(Modifier.height(6.dp))
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                AllowedTags.forEach { tag ->
                    UnearthChip(tag, tags.contains(tag)) {
                        tags = if (tags.contains(tag)) tags - tag else if (tags.size < 5) tags + tag else tags
                    }
                }
            }
            Spacer(Modifier.height(14.dp))
            Text("Google Maps link (optional)", fontFamily = DmSans, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = UnearthColor.Ink)
            Spacer(Modifier.height(6.dp))
            UnearthField(maps, { maps = it }, "https://maps.google.com/…")
            if (!mapsValid) {
                Text("Enter a valid Google Maps URL", fontFamily = DmSans, fontSize = 13.sp, color = UnearthColor.Amber)
            }
            if (error != null) Text(error!!, color = UnearthColor.Amber, fontFamily = DmSans)
            Spacer(Modifier.height(16.dp))
        }
        Column(Modifier.background(UnearthColor.FormBackground).navigationBarsPadding()) {
            HorizontalDivider(color = UnearthColor.Divider)
            if (!formValid) {
                Text(
                    hints.joinToString(" · "),
                    fontFamily = DmSans,
                    fontSize = 13.sp,
                    color = UnearthColor.Amber,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                )
            }
            PrimaryButton(
                if (busy) "Working…" else "Unearth",
                enabled = !busy && formValid,
                large = true,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
            ) {
                val cat = category
                scope.launch {
                    busy = true
                    error = null
                    try {
                        val findId = linkedId
                        if (findId != null) {
                            api.createFind(findId, CreateFindBody(description.trim(), liked.ifBlank { null }, disliked.ifBlank { null }, tags.toList()))
                            onDone("Added your find", GemDto(id = findId, name = linkedName ?: name, category = cat?.api ?: "other", slug = null))
                        } else if (cat != null) {
                            val created = api.createGem(
                                CreateGemBody(
                                    name = name.trim(),
                                    category = cat.api,
                                    lat = camera.position.target.latitude,
                                    lng = camera.position.target.longitude,
                                    description = description.trim(),
                                    liked = liked.ifBlank { null },
                                    disliked = disliked.ifBlank { null },
                                    tags = tags.toList(),
                                    googlePlaceId = googlePlaceId,
                                    googleMapsUrl = maps.ifBlank { null },
                                    confirmedNew = if (dismissedIds.isEmpty()) null else true,
                                ),
                            )
                            onDone("Gem unearthed", created)
                        }
                    } catch (e: HttpException) {
                        val parsed = parseApiError(e.response()?.errorBody()?.string())
                        if (e.code() == 409 && parsed?.candidates?.isNotEmpty() == true) {
                            match = parsed.candidates.first()
                            error = null
                        } else {
                            error = parsed?.error ?: "Couldn’t save."
                        }
                    } catch (e: Exception) {
                        error = e.message
                    } finally {
                        busy = false
                    }
                }
            }
        }
    }
}
