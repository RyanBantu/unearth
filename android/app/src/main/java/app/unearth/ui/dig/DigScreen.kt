package app.unearth.ui.dig

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.Tune
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import app.unearth.R
import app.unearth.data.model.Category
import app.unearth.ui.components.CategoryChip
import app.unearth.ui.components.GemCard
import app.unearth.ui.components.GemPin
import app.unearth.ui.components.ScreenEmpty
import app.unearth.ui.components.ScreenError
import app.unearth.ui.components.ScreenLoading
import app.unearth.ui.components.UnearthChip
import app.unearth.ui.theme.Bricolage
import app.unearth.ui.theme.DmSans
import app.unearth.ui.theme.UnearthColor
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.MapStyleOptions
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.maps.android.compose.CameraMoveStartedReason
import com.google.maps.android.compose.GoogleMap
import com.google.maps.android.compose.MapProperties
import com.google.maps.android.compose.MapUiSettings
import com.google.maps.android.compose.MapsComposeExperimentalApi
import com.google.maps.android.compose.MarkerComposable
import com.google.maps.android.compose.MarkerState
import com.google.maps.android.compose.rememberCameraPositionState

@OptIn(ExperimentalMaterial3Api::class, MapsComposeExperimentalApi::class)
@Composable
fun DigScreen(
    onGem: (String) -> Unit,
    viewModel: DigViewModel = hiltViewModel(),
) {
    val ui by viewModel.ui.collectAsStateWithLifecycle()
    val snack = remember { SnackbarHostState() }
    val context = LocalContext.current
    var showList by remember { mutableStateOf(false) }
    val camera = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(ui.center, 14f)
    }
    LaunchedEffect(ui.center) {
        camera.move(CameraUpdateFactory.newLatLngZoom(ui.center, 14f))
    }
    LaunchedEffect(camera.isMoving) {
        if (!camera.isMoving && camera.cameraMoveStartedReason == CameraMoveStartedReason.GESTURE) {
            viewModel.onCameraSettled(camera.position.target)
        }
    }
    LaunchedEffect(ui.snackbar) {
        ui.snackbar?.let {
            snack.showSnackbar(it)
            viewModel.clearSnackbar()
        }
    }
    val style = remember {
        runCatching { MapStyleOptions.loadRawResourceStyle(context, R.raw.map_style) }.getOrNull()
    }
    val sheetGem = ui.selected ?: ui.gems.firstOrNull()

    Box(Modifier.fillMaxSize()) {
        GoogleMap(
            modifier = Modifier.fillMaxSize(),
            cameraPositionState = camera,
            properties = MapProperties(mapStyleOptions = style, isMyLocationEnabled = ui.myLocation != null),
            uiSettings = MapUiSettings(zoomControlsEnabled = false, mapToolbarEnabled = false),
            onMapLoaded = {
                camera.move(CameraUpdateFactory.newLatLngZoom(ui.center, 14f))
            },
        ) {
            ui.gems.forEach { gem ->
                MarkerComposable(
                    state = MarkerState(com.google.android.gms.maps.model.LatLng(gem.lat, gem.lng)),
                    keys = arrayOf<Any>(gem.id, ui.selected?.id.orEmpty()),
                    onClick = {
                        viewModel.select(gem)
                        true
                    },
                ) {
                    GemPin(Category.fromApi(gem.category), ui.selected?.id == gem.id)
                }
            }
        }
        Column(Modifier.statusBarsPadding().padding(horizontal = 16.dp, vertical = 12.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
                Row(
                    Modifier
                        .weight(1f)
                        .height(48.dp)
                        .shadow(8.dp, RoundedCornerShape(16.dp))
                        .clip(RoundedCornerShape(16.dp))
                        .background(UnearthColor.Surface)
                        .padding(horizontal = 14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(Icons.Rounded.Search, contentDescription = "Search a town or area", tint = UnearthColor.InkSecondary)
                    BasicTextField(
                        value = ui.query,
                        onValueChange = viewModel::onQuery,
                        singleLine = true,
                        textStyle = androidx.compose.ui.text.TextStyle(fontFamily = DmSans, fontSize = 16.sp, color = UnearthColor.Ink),
                        modifier = Modifier.weight(1f).padding(horizontal = 10.dp),
                        decorationBox = { inner ->
                            if (ui.query.isEmpty()) Text("Dig around a town or area", color = UnearthColor.InkSecondary, fontFamily = DmSans, fontSize = 16.sp)
                            inner()
                        },
                    )
                    if (ui.query.isNotEmpty()) {
                        Icon(
                            Icons.Rounded.Close,
                            contentDescription = "Clear search",
                            tint = UnearthColor.InkSecondary,
                            modifier = Modifier.size(20.dp).clickable { viewModel.clearQuery() },
                        )
                    }
                }
                Box(
                    Modifier
                        .size(48.dp)
                        .shadow(8.dp, RoundedCornerShape(16.dp))
                        .clip(RoundedCornerShape(16.dp))
                        .background(UnearthColor.Surface)
                        .clickable { viewModel.setCategory(null) },
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Rounded.Tune, contentDescription = "Reset filters", tint = UnearthColor.Ink)
                }
            }
            if (ui.towns.isNotEmpty()) {
                Column(
                    Modifier
                        .padding(top = 8.dp)
                        .fillMaxWidth()
                        .shadow(8.dp, RoundedCornerShape(16.dp))
                        .clip(RoundedCornerShape(16.dp))
                        .background(UnearthColor.Surface),
                ) {
                    ui.towns.forEach { hit ->
                        Text(
                            hit.name,
                            Modifier.fillMaxWidth().clickable { viewModel.goToTown(hit) }.padding(14.dp),
                            fontFamily = DmSans,
                            color = UnearthColor.Ink,
                        )
                    }
                }
            }
            Spacer(Modifier.height(12.dp))
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                item { UnearthChip("All", ui.category == null) { viewModel.setCategory(null) } }
                items(Category.digFilters) { cat ->
                    CategoryChip(cat, ui.category == cat) { viewModel.setCategory(cat) }
                }
            }
        }
        Column(
            Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .clip(RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp))
                .background(UnearthColor.Surface)
                .padding(top = 10.dp, start = 16.dp, end = 16.dp, bottom = 18.dp),
        ) {
            Box(Modifier.align(Alignment.CenterHorizontally).width(40.dp).height(5.dp).clip(RoundedCornerShape(3.dp)).background(UnearthColor.Grabber))
            Spacer(Modifier.height(14.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Gems near you", fontFamily = Bricolage, fontWeight = FontWeight.Bold, fontSize = 22.sp, color = UnearthColor.Ink, modifier = Modifier.weight(1f))
                Text(
                    "See list",
                    color = UnearthColor.Green,
                    fontFamily = DmSans,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp,
                    modifier = Modifier.clickable { showList = true },
                )
            }
            Spacer(Modifier.height(14.dp))
            when {
                ui.loading && ui.gems.isEmpty() -> ScreenLoading("Finding gems nearby…")
                ui.error != null && ui.gems.isEmpty() -> ScreenError(ui.error!!) { viewModel.load() }
                sheetGem != null -> GemCard(sheetGem) { onGem(sheetGem.id) }
                else -> ScreenEmpty("No gems near here", "No gems near here yet. Unearth the first one.")
            }
        }
        SnackbarHost(snack, Modifier.align(Alignment.TopCenter).statusBarsPadding())
    }

    if (showList) {
        ModalBottomSheet(
            onDismissRequest = { showList = false },
            sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
            containerColor = UnearthColor.FormBackground,
        ) {
            Text("Gems near you", Modifier.padding(horizontal = 16.dp), fontFamily = Bricolage, fontWeight = FontWeight.Bold, fontSize = 22.sp)
            Spacer(Modifier.height(12.dp))
            val sorted = ui.gems.sortedBy { it.distanceM ?: Double.MAX_VALUE }
            if (sorted.isEmpty()) {
                ScreenEmpty("No gems near here", "No gems near here yet. Unearth the first one.")
            } else {
                LazyColumn(Modifier.padding(horizontal = 16.dp)) {
                    items(sorted, key = { it.id }) { gem ->
                        GemCard(gem) {
                            showList = false
                            onGem(gem.id)
                        }
                        Spacer(Modifier.height(12.dp))
                    }
                }
            }
        }
    }
}
