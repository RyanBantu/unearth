package app.unearth.ui.tabs

import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.AutoAwesome
import androidx.compose.material.icons.rounded.ChevronRight
import androidx.compose.material.icons.rounded.Notifications
import androidx.compose.material.icons.automirrored.rounded.OpenInNew
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.unearth.data.api.BlockedUserDto
import app.unearth.data.api.UnearthApi
import app.unearth.data.model.ActivityEventDto
import app.unearth.data.model.FindDto
import app.unearth.data.model.GemDto
import app.unearth.data.model.ProspectorLevel
import app.unearth.data.model.UserDto
import app.unearth.data.model.relativeTime
import app.unearth.data.session.SessionRepository
import app.unearth.ui.components.Avatar
import app.unearth.ui.components.GemCard
import app.unearth.ui.components.OutlineButton
import app.unearth.ui.components.ScreenEmpty
import app.unearth.ui.components.ScreenError
import app.unearth.ui.components.ScreenLoading
import app.unearth.ui.theme.Bricolage
import app.unearth.ui.theme.DmSans
import app.unearth.ui.theme.UnearthColor
import kotlinx.coroutines.launch

private const val TERMS = "https://unearth-1o4a.onrender.com/terms"
private const val PRIVACY = "https://unearth-1o4a.onrender.com/privacy"
private const val GUIDELINES = "https://unearth-1o4a.onrender.com/guidelines"

@Composable
fun StashScreen(api: UnearthApi, onGem: (String) -> Unit) {
    var gems by remember { mutableStateOf<List<GemDto>>(emptyList()) }
    var error by remember { mutableStateOf<String?>(null) }
    var loaded by remember { mutableStateOf(false) }
    suspend fun reload() {
        runCatching { api.stash() }
            .onSuccess { gems = it.gems; error = null; loaded = true }
            .onFailure { error = it.message; loaded = true }
    }
    val scope = rememberCoroutineScope()
    LaunchedEffect(Unit) { reload() }
    Column(Modifier.fillMaxSize().background(UnearthColor.FormBackground).statusBarsPadding()) {
        Text("Stash", Modifier.padding(16.dp), fontFamily = Bricolage, fontWeight = FontWeight.Bold, fontSize = 22.sp, color = UnearthColor.Ink)
        when {
            !loaded -> ScreenLoading("Loading your stash…")
            error != null && gems.isEmpty() -> ScreenError(error!!) { scope.launch { reload() } }
            gems.isEmpty() -> ScreenEmpty("Nothing stashed yet", "Your stash is empty. Tap the bookmark on any gem to save it for later.")
            else -> LazyColumn(Modifier.weight(1f).padding(horizontal = 16.dp)) {
                items(gems, key = { it.id }) {
                    Column(
                        Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(18.dp))
                            .background(UnearthColor.Surface)
                            .border(1.dp, UnearthColor.Border, RoundedCornerShape(18.dp))
                            .padding(14.dp),
                    ) {
                        GemCard(it) { onGem(it.id) }
                    }
                    Spacer(Modifier.height(12.dp))
                }
            }
        }
    }
}

@Composable
fun ActivityScreen(api: UnearthApi, onGem: (String) -> Unit) {
    var events by remember { mutableStateOf<List<ActivityEventDto>>(emptyList()) }
    var error by remember { mutableStateOf<String?>(null) }
    var loaded by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        runCatching { api.activity() }
            .onSuccess { events = it.events; loaded = true }
            .onFailure { error = it.message; loaded = true }
    }
    Column(Modifier.fillMaxSize().background(UnearthColor.FormBackground).statusBarsPadding()) {
        Text("Activity", Modifier.padding(16.dp), fontFamily = Bricolage, fontWeight = FontWeight.Bold, fontSize = 22.sp, color = UnearthColor.Ink)
        when {
            !loaded -> ScreenLoading("Loading activity…")
            error != null && events.isEmpty() -> ScreenError(error!!) {}
            events.isEmpty() -> ScreenEmpty("No activity yet", "Nothing yet. Unearth your first gem and updates will show up here.")
            else -> LazyColumn(Modifier.weight(1f)) {
                items(events.size) { i ->
                    val e = events[i]
                    Row(
                        Modifier
                            .fillMaxWidth()
                            .clickable(enabled = e.gemId != null) { e.gemId?.let(onGem) }
                            .padding(horizontal = 16.dp, vertical = 14.dp),
                        verticalAlignment = Alignment.Top,
                    ) {
                        Icon(
                            when (e.type) {
                                "polished" -> Icons.Rounded.AutoAwesome
                                "also_found" -> Icons.Rounded.Person
                                else -> Icons.Rounded.Notifications
                            },
                            contentDescription = null,
                            tint = if (e.type == "polished") UnearthColor.Green else UnearthColor.AmberPin,
                            modifier = Modifier
                                .size(40.dp)
                                .clip(CircleShape)
                                .background(UnearthColor.GreenTint)
                                .padding(8.dp),
                        )
                        Spacer(Modifier.size(12.dp))
                        Column {
                            Text(e.message ?: defaultActivity(e), fontFamily = DmSans, color = UnearthColor.Ink, fontSize = 15.sp)
                            Text(relativeTime(e.createdAt), fontFamily = DmSans, fontSize = 14.sp, color = UnearthColor.InkSecondary)
                        }
                    }
                    HorizontalDivider(color = UnearthColor.Divider)
                }
            }
        }
    }
}

private fun defaultActivity(e: ActivityEventDto) = when (e.type) {
    "polished" -> "Your gem ${e.gemName} was polished"
    "also_found" -> "@${e.actorHandle ?: "Someone"} also found ${e.gemName}"
    "mined_out" -> "${e.gemName} is now mined out"
    else -> e.gemName.orEmpty()
}

@Composable
fun ProfileScreen(
    api: UnearthApi,
    session: SessionRepository,
    user: UserDto?,
    onGem: (String) -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var me by remember { mutableStateOf(user) }
    var pane by remember { mutableStateOf(ProfilePane.Main) }
    var blocked by remember { mutableStateOf<List<BlockedUserDto>>(emptyList()) }
    var confirmDelete by remember { mutableStateOf(false) }
    var findPendingDelete by remember { mutableStateOf<FindDto?>(null) }

    LaunchedEffect(Unit) { runCatching { api.me() }.onSuccess { me = it } }
    LaunchedEffect(pane) {
        if (pane == ProfilePane.Blocked) {
            runCatching { api.blocks() }.onSuccess { blocked = it.blocks }
        }
    }

    if (confirmDelete) {
        AlertDialog(
            onDismissRequest = { confirmDelete = false },
            title = { Text("Delete account?") },
            text = { Text("This permanently deletes your account, finds, and stash. This cannot be undone.") },
            confirmButton = {
                TextButton(onClick = {
                    confirmDelete = false
                    scope.launch { session.deleteAccount() }
                }) { Text("Delete account") }
            },
            dismissButton = { TextButton(onClick = { confirmDelete = false }) { Text("Cancel") } },
        )
    }
    findPendingDelete?.let { find ->
        val count = find.gemFindCount ?: 1
        AlertDialog(
            onDismissRequest = { findPendingDelete = null },
            title = { Text(if (count <= 1) "Delete this gem?" else "Delete your find?") },
            text = {
                Text(
                    if (count <= 1) {
                        "This removes the gem from Unearth for everyone. This can't be undone."
                    } else {
                        val others = count - 1
                        val noun = if (others == 1) "other" else "others"
                        "Your write-up will be removed. The gem stays because $others $noun found it too."
                    },
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    findPendingDelete = null
                    scope.launch {
                        runCatching { api.deleteFind(find.id) }
                        runCatching { api.me() }.onSuccess { me = it }
                    }
                }) { Text("Delete") }
            },
            dismissButton = { TextButton(onClick = { findPendingDelete = null }) { Text("Cancel") } },
        )
    }

    Column(Modifier.fillMaxSize().background(UnearthColor.FormBackground).statusBarsPadding()) {
        when (pane) {
            ProfilePane.Blocked -> {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = { pane = ProfilePane.Settings }) {
                        Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "Back")
                    }
                    Text("Blocked users", fontFamily = Bricolage, fontWeight = FontWeight.Bold, fontSize = 22.sp)
                }
                if (blocked.isEmpty()) {
                    ScreenEmpty("No blocked users", "People you block won’t show up in Dig or Activity.")
                    Spacer(Modifier.weight(1f))
                } else {
                    LazyColumn(Modifier.weight(1f).padding(horizontal = 16.dp)) {
                        items(blocked, key = { it.id }) { b ->
                            Row(
                                Modifier.fillMaxWidth().padding(vertical = 12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Text("@${b.handle ?: "user"}", Modifier.weight(1f), fontFamily = DmSans, fontSize = 16.sp)
                                Text(
                                    "Unblock",
                                    color = UnearthColor.Green,
                                    fontFamily = DmSans,
                                    fontWeight = FontWeight.SemiBold,
                                    modifier = Modifier.clickable {
                                        scope.launch {
                                            runCatching { api.unblock(b.id) }
                                            blocked = blocked.filter { it.id != b.id }
                                        }
                                    },
                                )
                            }
                        }
                    }
                }
            }
            ProfilePane.Settings -> {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = { pane = ProfilePane.Main }) {
                        Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "Back")
                    }
                    Text("Settings", fontFamily = Bricolage, fontWeight = FontWeight.Bold, fontSize = 22.sp)
                }
                Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(16.dp)) {
                    SettingsRow("Blocked users", "Manage people you’ve blocked", chevron = true) { pane = ProfilePane.Blocked }
                    SettingsRow("Terms of Use", "Community rules and moderation") {
                        CustomTabsIntent.Builder().build().launchUrl(context, Uri.parse(TERMS))
                    }
                    SettingsRow("Privacy Policy", "How Unearth uses your data") {
                        CustomTabsIntent.Builder().build().launchUrl(context, Uri.parse(PRIVACY))
                    }
                    SettingsRow("Posting guidelines", "Public places only") {
                        CustomTabsIntent.Builder().build().launchUrl(context, Uri.parse(GUIDELINES))
                    }
                    Spacer(Modifier.height(16.dp))
                    OutlineButton("Sign out") { scope.launch { session.signOut() } }
                    Spacer(Modifier.height(12.dp))
                    Text(
                        "Delete account",
                        color = UnearthColor.Amber,
                        fontFamily = DmSans,
                        fontWeight = FontWeight.SemiBold,
                        modifier = Modifier.fillMaxWidth().clickable { confirmDelete = true }.padding(vertical = 14.dp),
                    )
                }
            }
            ProfilePane.Main -> {
                val u = me
                Column(Modifier.weight(1f).verticalScroll(rememberScrollState()).padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Avatar(u?.handle ?: "prospector", 72.dp)
                    Spacer(Modifier.height(12.dp))
                    Text("@${u?.handle ?: "prospector"}", fontFamily = Bricolage, fontWeight = FontWeight.Bold, fontSize = 22.sp, color = UnearthColor.Ink)
                    Spacer(Modifier.height(6.dp))
                    Text(ProspectorLevel.from(u?.gemsUnearthed ?: 0).label, fontFamily = DmSans, color = UnearthColor.Green, fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.height(16.dp))
                    Text("${u?.gemsUnearthed ?: 0} gems unearthed", fontFamily = Bricolage, fontWeight = FontWeight.Bold, fontSize = 28.sp, color = UnearthColor.Ink)
                    Text("${u?.firstFinds ?: 0} First finds", fontFamily = DmSans, color = UnearthColor.InkSecondary)
                    Spacer(Modifier.height(24.dp))
                    Text("Your finds", Modifier.fillMaxWidth(), fontFamily = DmSans, fontWeight = FontWeight.SemiBold, color = UnearthColor.Ink)
                    Spacer(Modifier.height(8.dp))
                    val finds = u?.finds.orEmpty()
                    if (finds.isEmpty()) {
                        ScreenEmpty("No finds yet", "Unearth a gem to get started. Your finds will show up here.")
                    } else {
                        finds.forEach { find ->
                            Column(
                                Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(14.dp))
                                    .background(UnearthColor.Surface)
                                    .clickable { find.gemId?.let(onGem) }
                                    .padding(14.dp),
                            ) {
                                Text(find.gemName ?: "Gem", fontFamily = Bricolage, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                                if (!find.description.isNullOrBlank()) {
                                    Text(find.description, fontFamily = DmSans, color = UnearthColor.InkSecondary, maxLines = 2, fontSize = 14.sp)
                                }
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    if (find.isFirstFind) {
                                        Text(
                                            "First find",
                                            modifier = Modifier.clip(RoundedCornerShape(8.dp)).background(UnearthColor.AmberTint).padding(horizontal = 8.dp, vertical = 4.dp),
                                            color = UnearthColor.AmberDeep,
                                            fontFamily = DmSans,
                                            fontWeight = FontWeight.SemiBold,
                                            fontSize = 12.sp,
                                        )
                                    }
                                    Spacer(Modifier.weight(1f))
                                    Text("Delete", color = UnearthColor.Amber, fontFamily = DmSans, fontSize = 13.sp, modifier = Modifier.clickable { findPendingDelete = find })
                                }
                            }
                            Spacer(Modifier.height(8.dp))
                        }
                    }
                    Spacer(Modifier.height(16.dp))
                    Text("Settings", Modifier.fillMaxWidth().clickable { pane = ProfilePane.Settings }, color = UnearthColor.Green, fontFamily = DmSans, fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}

private enum class ProfilePane { Main, Settings, Blocked }

@Composable
private fun SettingsRow(title: String, subtitle: String, chevron: Boolean = false, onClick: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .padding(vertical = 6.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(UnearthColor.Surface)
            .border(1.dp, UnearthColor.Border, RoundedCornerShape(14.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(title, fontFamily = DmSans, fontWeight = FontWeight.SemiBold, fontSize = 16.sp, color = UnearthColor.Ink)
            Text(subtitle, fontFamily = DmSans, fontSize = 14.sp, color = UnearthColor.InkSecondary)
        }
        Icon(
            if (chevron) Icons.Rounded.ChevronRight else Icons.AutoMirrored.Rounded.OpenInNew,
            contentDescription = null,
            tint = UnearthColor.Green,
        )
    }
}
