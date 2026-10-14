package app.unearth.ui.gem

import android.content.Intent
import android.net.Uri
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
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Bookmark
import androidx.compose.material.icons.rounded.BookmarkBorder
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Directions
import androidx.compose.material.icons.rounded.MoreHoriz
import androidx.compose.material.icons.rounded.Streetview
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex
import app.unearth.data.api.ReportBody
import app.unearth.data.api.UnearthApi
import app.unearth.data.api.VoteBody
import app.unearth.data.model.Category
import app.unearth.data.model.FindDto
import app.unearth.data.model.GemDto
import app.unearth.data.model.GemStatus
import app.unearth.data.model.dislikedNotes
import app.unearth.data.model.effectiveFindCount
import app.unearth.data.model.finderHandles
import app.unearth.data.model.firstFind
import app.unearth.data.model.formatDistance
import app.unearth.data.model.likedNotes
import app.unearth.data.model.mergedTags
import app.unearth.data.model.otherFinds
import app.unearth.data.model.relativeTime
import app.unearth.data.model.unearthedLine
import app.unearth.ui.components.Avatar
import app.unearth.ui.components.OutlineButton
import app.unearth.ui.components.PrimaryButton
import app.unearth.ui.components.ScreenError
import app.unearth.ui.components.ScreenLoading
import app.unearth.ui.components.StatusBadge
import app.unearth.ui.components.VoteRow
import app.unearth.ui.theme.Bricolage
import app.unearth.ui.theme.DmSans
import app.unearth.ui.theme.UnearthColor
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.GoogleMap
import com.google.maps.android.compose.MapUiSettings
import com.google.maps.android.compose.Marker
import com.google.maps.android.compose.MarkerState
import com.google.maps.android.compose.rememberCameraPositionState
import kotlinx.coroutines.launch

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun GemScreen(
    id: String,
    api: UnearthApi,
    currentUserId: String?,
    onBack: () -> Unit,
    onFound: (GemDto) -> Unit,
    onFindDeleted: (gemDeleted: Boolean, message: String) -> Unit = { _, _ -> },
    onHidden: () -> Unit = {},
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val snack = remember { SnackbarHostState() }
    var gem by remember { mutableStateOf<GemDto?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var menu by remember { mutableStateOf(false) }
    var confirmDelete by remember { mutableStateOf(false) }
    var blockTarget by remember { mutableStateOf<Pair<String, String>?>(null) }
    var reportTarget by remember { mutableStateOf<String?>(null) }

    suspend fun reload() {
        runCatching { api.gem(id) }.onSuccess { gem = it; error = null }.onFailure { error = it.message }
    }
    LaunchedEffect(id) { reload() }

    val g = gem
    if (g == null) {
        Box(Modifier.fillMaxSize().background(UnearthColor.FormBackground), contentAlignment = Alignment.Center) {
            if (error != null) ScreenError(error!!) { scope.launch { reload() } }
            else ScreenLoading("Loading gem…")
        }
        return
    }
    val mapsInstalled = remember {
        context.packageManager.getLaunchIntentForPackage("com.google.android.apps.maps") != null
    }
    val camera = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(LatLng(g.lat, g.lng), 15f)
    }
    val first = g.firstFind()
    val others = g.otherFinds()
    val handles = g.finderHandles()
    val hasFound = g.myFindId != null
    val otherFinderCount = (g.effectiveFindCount() - 1).coerceAtLeast(0)
    val primaryBlock = (listOfNotNull(first) + others)
        .firstOrNull { it.userId != null && it.userId != currentUserId }
        ?.let { it.userId!! to (it.handle ?: "user") }
    val addressLine = buildString {
        append(g.address.orEmpty())
        g.distanceM?.let {
            if (isNotEmpty()) append(" · ")
            append("${formatDistance(it)} away")
        }
    }

    if (confirmDelete) {
        AlertDialog(
            onDismissRequest = { confirmDelete = false },
            title = { Text(if (otherFinderCount == 0) "Delete this gem?" else "Delete your find?") },
            text = {
                Text(
                    if (otherFinderCount == 0) {
                        "This removes the gem from Unearth for everyone. This can't be undone."
                    } else {
                        val noun = if (otherFinderCount == 1) "other" else "others"
                        "Your write-up will be removed. The gem stays because $otherFinderCount $noun found it too."
                    },
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    confirmDelete = false
                    val findId = g.myFindId ?: return@TextButton
                    scope.launch {
                        runCatching { api.deleteFind(findId) }
                            .onSuccess { res ->
                                if (res.gemDeleted) onFindDeleted(true, "Gem deleted")
                                else {
                                    snack.showSnackbar("Find deleted")
                                    reload()
                                    onFindDeleted(false, "Find deleted")
                                }
                            }
                            .onFailure { snack.showSnackbar(it.message ?: "Couldn’t delete.") }
                    }
                }) { Text("Delete") }
            },
            dismissButton = { TextButton(onClick = { confirmDelete = false }) { Text("Cancel") } },
        )
    }
    blockTarget?.let { (uid, handle) ->
        AlertDialog(
            onDismissRequest = { blockTarget = null },
            title = { Text("Block @$handle?") },
            text = { Text("You won't see gems or finds from @$handle.") },
            confirmButton = {
                TextButton(onClick = {
                    blockTarget = null
                    scope.launch {
                        runCatching { api.block(uid) }
                            .onSuccess { onHidden() }
                            .onFailure { snack.showSnackbar(it.message ?: "Couldn’t block.") }
                    }
                }) { Text("Block") }
            },
            dismissButton = { TextButton(onClick = { blockTarget = null }) { Text("Cancel") } },
        )
    }
    reportTarget?.let { target ->
        AlertDialog(
            onDismissRequest = { reportTarget = null },
            title = { Text(if (target == "gem") "Report this gem?" else "Report this find?") },
            text = {
                Column {
                    listOf(
                        "spam" to "Spam or scam",
                        "inappropriate" to "Inappropriate",
                        "inaccurate" to "Inaccurate or misleading",
                        "other" to "Something else",
                    ).forEach { (reason, label) ->
                        Text(
                            label,
                            modifier = Modifier.fillMaxWidth().clickable {
                                val t = reportTarget
                                reportTarget = null
                                scope.launch {
                                    runCatching {
                                        if (t == "gem" || t == null) api.report(ReportBody(gemId = g.id, reason = reason))
                                        else api.report(ReportBody(gemId = g.id, findId = t, reason = reason))
                                    }.onSuccess {
                                        snack.showSnackbar("Thanks — we'll review this within 24 hours.")
                                        if (t == "gem") onHidden() else reload()
                                    }.onFailure { snack.showSnackbar(it.message ?: "Couldn’t report.") }
                                }
                            }.padding(vertical = 10.dp),
                            fontFamily = DmSans,
                            color = UnearthColor.Amber,
                        )
                    }
                }
            },
            confirmButton = {},
            dismissButton = { TextButton(onClick = { reportTarget = null }) { Text("Cancel") } },
        )
    }

    Box(Modifier.fillMaxSize().background(UnearthColor.FormBackground)) {
        Column(Modifier.fillMaxSize()) {
            Box(Modifier.fillMaxWidth().height(260.dp)) {
                GoogleMap(
                    modifier = Modifier.fillMaxSize(),
                    cameraPositionState = camera,
                    uiSettings = MapUiSettings(
                        zoomControlsEnabled = false,
                        scrollGesturesEnabled = false,
                        zoomGesturesEnabled = false,
                        rotationGesturesEnabled = false,
                    ),
                ) {
                    Marker(state = MarkerState(LatLng(g.lat, g.lng)), title = g.name)
                }
                Row(
                    Modifier.statusBarsPadding().padding(horizontal = 16.dp, vertical = 16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    RoundMapButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "Back")
                    }
                    Spacer(Modifier.weight(1f))
                    Box {
                        RoundMapButton(onClick = { menu = true }) {
                            Icon(Icons.Rounded.MoreHoriz, contentDescription = "More")
                        }
                        DropdownMenu(menu, onDismissRequest = { menu = false }) {
                            if (hasFound) {
                                DropdownMenuItem(text = { Text("Delete my find") }, onClick = {
                                    menu = false
                                    confirmDelete = true
                                })
                            } else {
                                DropdownMenuItem(text = { Text("Report") }, onClick = {
                                    menu = false
                                    reportTarget = "gem"
                                })
                            }
                            if (primaryBlock != null) {
                                DropdownMenuItem(text = { Text("Block @${primaryBlock.second}") }, onClick = {
                                    menu = false
                                    blockTarget = primaryBlock
                                })
                            }
                        }
                    }
                    Spacer(Modifier.width(10.dp))
                    RoundMapButton(onClick = {
                        scope.launch {
                            runCatching {
                                if (g.isStashed) api.removeStash(g.id) else api.addStash(g.id)
                                reload()
                                snack.showSnackbar(if (g.isStashed) "Removed from Stash" else "Saved to Stash")
                            }.onFailure { snack.showSnackbar(it.message ?: "Couldn’t update stash.") }
                        }
                    }) {
                        Icon(
                            if (g.isStashed) Icons.Rounded.Bookmark else Icons.Rounded.BookmarkBorder,
                            contentDescription = if (g.isStashed) "Remove from Stash" else "Stash",
                            tint = if (g.isStashed) UnearthColor.Green else UnearthColor.Ink,
                        )
                    }
                }
                if (mapsInstalled) {
                    Row(
                        Modifier
                            .align(Alignment.BottomEnd)
                            .padding(end = 16.dp, bottom = 14.dp)
                            .shadow(8.dp, RoundedCornerShape(50))
                            .clip(RoundedCornerShape(50))
                            .background(UnearthColor.Surface)
                            .clickable {
                                context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("google.streetview:cbll=${g.lat},${g.lng}")))
                            }
                            .padding(horizontal = 14.dp)
                            .height(40.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(Icons.Rounded.Streetview, contentDescription = null, tint = UnearthColor.Ink, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("Street View", fontFamily = DmSans, fontWeight = FontWeight.Medium, fontSize = 14.sp, color = UnearthColor.Ink)
                    }
                }
            }
            Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(20.dp)) {
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    CategoryLabel(Category.fromApi(g.category).display)
                    GemStatus.badges(g.effectiveFindCount()).forEach { StatusBadge(it) }
                    if (g.upvotes + g.downvotes > 0) {
                        Text("👍 ${g.upvotes - g.downvotes}", fontFamily = DmSans, fontSize = 12.sp, color = UnearthColor.InkSecondary)
                    }
                }
                Spacer(Modifier.height(16.dp))
                Text(g.name, fontFamily = Bricolage, fontWeight = FontWeight.Bold, fontSize = 28.sp, color = UnearthColor.Ink, lineHeight = 31.sp)
                if (addressLine.isNotBlank()) {
                    Spacer(Modifier.height(6.dp))
                    Text(addressLine, fontFamily = DmSans, color = UnearthColor.InkSecondary, fontSize = 14.sp)
                }
                Spacer(Modifier.height(16.dp))
                Row(
                    Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(UnearthColor.GreenTint)
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(Modifier.width((20 * (handles.take(3).size - 1).coerceAtLeast(0) + 28).dp).height(28.dp)) {
                        handles.take(3).forEachIndexed { i, handle ->
                            Avatar(
                                handle,
                                28.dp,
                                Modifier
                                    .zIndex((3 - i).toFloat())
                                    .offset(x = (i * 20).dp)
                                    .border(2.dp, UnearthColor.Surface, CircleShape),
                            )
                        }
                    }
                    Spacer(Modifier.width(10.dp))
                    Column {
                        Text(unearthedLine(g), fontFamily = DmSans, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = UnearthColor.GreenPressed)
                        val firstHandle = g.firstFinderHandle ?: handles.firstOrNull()
                        if (firstHandle != null) {
                            Text("First find: @$firstHandle", fontFamily = DmSans, fontSize = 14.sp, color = UnearthColor.GreenPressed)
                        }
                    }
                }
                if (g.myFindId == null) {
                    Spacer(Modifier.height(16.dp))
                    VoteRow(g.upvotes, g.downvotes, g.myVote, true, {
                        scope.launch {
                            runCatching {
                                if (g.myVote == 1) api.clearVote(g.id) else api.setVote(g.id, VoteBody(1))
                                reload()
                            }
                        }
                    }, {
                        scope.launch {
                            runCatching {
                                if (g.myVote == -1) api.clearVote(g.id) else api.setVote(g.id, VoteBody(-1))
                                reload()
                            }
                        }
                    })
                }
                val note = first?.description
                if (!note.isNullOrBlank()) {
                    Spacer(Modifier.height(16.dp))
                    Text(note, fontFamily = DmSans, fontSize = 15.sp, color = UnearthColor.InkTertiary, lineHeight = 22.5.sp)
                    Text(
                        "Report find",
                        color = UnearthColor.InkTertiary,
                        fontFamily = DmSans,
                        fontSize = 14.sp,
                        modifier = Modifier.padding(top = 8.dp).clickable { first?.id?.let { reportTarget = it } },
                    )
                }
                Spacer(Modifier.height(16.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    OpinionCard("Liked", Icons.Rounded.Check, UnearthColor.Green, g.likedNotes(), Modifier.weight(1f))
                    OpinionCard("Didn't like", Icons.Rounded.Close, UnearthColor.Amber, g.dislikedNotes(), Modifier.weight(1f))
                }
                val tags = g.mergedTags()
                if (tags.isNotEmpty()) {
                    Spacer(Modifier.height(16.dp))
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        tags.forEach {
                            Text(
                                it,
                                modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(UnearthColor.NeutralChip).padding(horizontal = 8.dp, vertical = 4.dp),
                                fontFamily = DmSans,
                                fontSize = 13.sp,
                                color = UnearthColor.Ink,
                            )
                        }
                    }
                }
                if (others.isNotEmpty()) {
                    Spacer(Modifier.height(24.dp))
                    Text("Other finds", fontFamily = Bricolage, fontWeight = FontWeight.Bold, fontSize = 18.sp, color = UnearthColor.Ink)
                    others.forEachIndexed { i, find ->
                        Spacer(Modifier.height(12.dp))
                        OtherFindRow(find, currentUserId, onReport = { reportTarget = find.id }, onBlock = { uid, handle ->
                            blockTarget = uid to handle
                        })
                        if (i != others.lastIndex) {
                            Spacer(Modifier.height(12.dp))
                            HorizontalDivider(color = UnearthColor.Divider)
                        }
                    }
                }
                Spacer(Modifier.height(24.dp))
            }
            Column(Modifier.fillMaxWidth().background(UnearthColor.Surface).navigationBarsPadding()) {
                Box(Modifier.fillMaxWidth().height(1.dp).background(UnearthColor.Divider))
                Row(
                    Modifier.padding(horizontal = 20.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    PrimaryButton("Directions", modifier = Modifier.weight(1f), icon = Icons.Rounded.Directions) {
                        val nav = Intent(Intent.ACTION_VIEW, Uri.parse("google.navigation:q=${g.lat},${g.lng}"))
                        if (nav.resolveActivity(context.packageManager) != null) context.startActivity(nav)
                        else context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://www.google.com/maps/dir/?api=1&destination=${g.lat},${g.lng}")))
                    }
                    if (hasFound) {
                        Text(
                            "You found this",
                            fontFamily = DmSans,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 16.sp,
                            color = UnearthColor.InkSecondary,
                            modifier = Modifier.weight(1f).height(50.dp).align(Alignment.CenterVertically),
                        )
                    } else {
                        OutlineButton("I found it too", modifier = Modifier.weight(1f)) { onFound(g) }
                    }
                }
                if (!g.googleMapsUrl.isNullOrBlank()) {
                    Text(
                        "Open in Google Maps",
                        color = UnearthColor.Green,
                        fontFamily = DmSans,
                        fontWeight = FontWeight.Medium,
                        fontSize = 14.sp,
                        modifier = Modifier.align(Alignment.CenterHorizontally).clickable {
                            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(g.googleMapsUrl)))
                        }.padding(bottom = 8.dp),
                    )
                }
                if (hasFound) {
                    Text(
                        "Report gem",
                        color = UnearthColor.InkSecondary,
                        fontFamily = DmSans,
                        fontSize = 14.sp,
                        modifier = Modifier.align(Alignment.CenterHorizontally).clickable { reportTarget = "gem" }.padding(bottom = 12.dp),
                    )
                }
            }
        }
        SnackbarHost(snack, Modifier.align(Alignment.TopCenter).statusBarsPadding())
    }
}

@Composable
private fun RoundMapButton(onClick: () -> Unit, content: @Composable () -> Unit) {
    IconButton(
        onClick = onClick,
        modifier = Modifier.size(44.dp).shadow(8.dp, CircleShape).clip(CircleShape).background(UnearthColor.Surface),
    ) { content() }
}

@Composable
private fun CategoryLabel(text: String) {
    Text(
        text,
        modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(UnearthColor.NeutralChip).padding(horizontal = 8.dp, vertical = 4.dp),
        fontFamily = DmSans,
        fontWeight = FontWeight.SemiBold,
        fontSize = 12.sp,
        color = UnearthColor.InkSecondary,
    )
}

@Composable
private fun OpinionCard(title: String, icon: androidx.compose.ui.graphics.vector.ImageVector, tint: androidx.compose.ui.graphics.Color, items: List<String>, modifier: Modifier = Modifier) {
    Column(
        modifier
            .clip(RoundedCornerShape(14.dp))
            .background(UnearthColor.Surface)
            .border(1.dp, UnearthColor.Border, RoundedCornerShape(14.dp))
            .padding(12.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            Icon(icon, contentDescription = null, tint = tint, modifier = Modifier.size(16.dp))
            Text(title, fontFamily = DmSans, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = tint)
        }
        Spacer(Modifier.height(6.dp))
        if (items.isEmpty()) {
            Text("—", fontFamily = DmSans, fontSize = 14.sp, color = UnearthColor.InkSecondary)
        } else {
            items.forEach { Text(it, fontFamily = DmSans, fontSize = 14.sp, color = UnearthColor.InkSecondary) }
        }
    }
}

@Composable
private fun OtherFindRow(
    find: FindDto,
    currentUserId: String?,
    onReport: () -> Unit,
    onBlock: (String, String) -> Unit,
) {
    Column {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("@${find.handle ?: "prospector"}", fontFamily = DmSans, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, color = UnearthColor.Ink)
            Spacer(Modifier.weight(1f))
            Text(relativeTime(find.createdAt), fontFamily = DmSans, fontSize = 14.sp, color = UnearthColor.InkSecondary)
        }
        if (!find.description.isNullOrBlank()) {
            Spacer(Modifier.height(6.dp))
            Text(find.description, fontFamily = DmSans, color = UnearthColor.InkSecondary, fontSize = 15.sp)
        }
        if (!find.liked.isNullOrBlank()) {
            Text("Liked: ${find.liked}", fontFamily = DmSans, fontSize = 14.sp, color = UnearthColor.Green)
        }
        if (!find.disliked.isNullOrBlank()) {
            Text("Didn't like: ${find.disliked}", fontFamily = DmSans, fontSize = 14.sp, color = UnearthColor.Amber)
        }
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp), modifier = Modifier.padding(top = 6.dp)) {
            Text("Report find", color = UnearthColor.InkTertiary, fontFamily = DmSans, fontSize = 14.sp, modifier = Modifier.clickable(onClick = onReport))
            val uid = find.userId
            if (uid != null && uid != currentUserId) {
                Text(
                    "Block @${find.handle ?: "user"}",
                    color = UnearthColor.InkTertiary,
                    fontFamily = DmSans,
                    fontSize = 14.sp,
                    modifier = Modifier.clickable { onBlock(uid, find.handle ?: "user") },
                )
            }
        }
    }
}
