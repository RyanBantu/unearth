package app.unearth.ui.onboarding

import android.Manifest
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Map
import androidx.compose.material3.Icon
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.unearth.BuildConfig
import app.unearth.data.auth.isGoogleCancel
import app.unearth.data.auth.requestGoogleIdToken
import app.unearth.data.session.SessionRepository
import app.unearth.ui.components.OutlineButton
import app.unearth.ui.components.PrimaryButton
import app.unearth.ui.components.UnearthField
import app.unearth.ui.components.UnearthLogo
import app.unearth.ui.theme.Bricolage
import app.unearth.ui.theme.DmSans
import app.unearth.ui.theme.UnearthColor
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import androidx.browser.customtabs.CustomTabsIntent
import android.net.Uri
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import app.unearth.R

@Composable
fun SignInScreen(session: SessionRepository) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }

    Column(
        Modifier
            .fillMaxSize()
            .background(UnearthColor.FormBackground)
            .statusBarsPadding()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Spacer(Modifier.weight(1f))
        UnearthLogo(112.dp)
        Spacer(Modifier.height(16.dp))
        Text("Unearth", fontFamily = Bricolage, fontWeight = FontWeight.Bold, fontSize = 40.sp, color = UnearthColor.Ink)
        Spacer(Modifier.height(8.dp))
        Text(
            "Find the places nobody's listed yet.",
            fontFamily = DmSans,
            fontSize = 15.sp,
            color = UnearthColor.InkSecondary,
            textAlign = TextAlign.Center,
        )
        Spacer(Modifier.weight(1f))
        if (error != null) {
            Text(error!!, color = UnearthColor.Amber, fontFamily = DmSans, fontSize = 14.sp, textAlign = TextAlign.Center)
            Spacer(Modifier.height(12.dp))
        }
        GoogleSignInButton(enabled = !busy) {
            scope.launch {
                busy = true
                error = null
                try {
                    session.signInGoogle(requestGoogleIdToken(context))
                } catch (e: Exception) {
                    if (!isGoogleCancel(e)) error = app.unearth.data.auth.googleSignInMessage(e)
                } finally {
                    busy = false
                }
            }
        }
        if (BuildConfig.ALLOW_DEV_SIGN_IN) {
            Spacer(Modifier.height(12.dp))
            TextButton(onClick = {
                scope.launch {
                    runCatching { session.signInDev() }.onFailure { error = it.message ?: "Mock sign-in failed." }
                }
            }) {
                Text("Continue with mock (DEBUG)", color = UnearthColor.InkSecondary, fontFamily = DmSans)
            }
        }
        Spacer(Modifier.height(8.dp))
    }
}

@Composable
private fun GoogleSignInButton(enabled: Boolean, onClick: () -> Unit) {
    Row(
        Modifier
            .fillMaxWidth()
            .height(50.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(Color.White)
            .border(1.dp, UnearthColor.Border, RoundedCornerShape(14.dp))
            .clickable(enabled, onClick = onClick)
            .semantics { contentDescription = "Continue with Google" },
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center,
    ) {
        Image(painterResource(R.drawable.google_g), contentDescription = null, modifier = Modifier.size(18.dp))
        Spacer(Modifier.size(12.dp))
        Text("Continue with Google", fontFamily = DmSans, fontWeight = FontWeight.Medium, fontSize = 16.sp, color = Color(0xFF1F1F1F))
    }
}

@Composable
fun TermsScreen(session: SessionRepository) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    Column(
        Modifier.fillMaxSize().background(UnearthColor.FormBackground).statusBarsPadding().padding(24.dp),
    ) {
        UnearthLogo(64.dp, Modifier.align(Alignment.CenterHorizontally))
        Spacer(Modifier.height(24.dp))
        Text("Terms of Use", fontFamily = Bricolage, fontWeight = FontWeight.Bold, fontSize = 22.sp, color = UnearthColor.Ink)
        Spacer(Modifier.height(8.dp))
        Text(
            "Post public places only. No abusive, hateful or sexual content, spam or private homes. We remove reported content within 24 hours and ban users who break the rules.",
            fontFamily = DmSans,
            fontSize = 15.sp,
            color = UnearthColor.InkSecondary,
            lineHeight = 22.5.sp,
        )
        TextButton(onClick = {
            CustomTabsIntent.Builder().build().launchUrl(context, Uri.parse("https://unearth-1o4a.onrender.com/terms"))
        }) {
            Text("Read the full Terms of Use", color = UnearthColor.Green, fontFamily = DmSans, fontWeight = FontWeight.SemiBold)
        }
        if (error != null) Text(error!!, color = UnearthColor.Amber, fontFamily = DmSans, fontSize = 14.sp)
        Spacer(Modifier.weight(1f))
        PrimaryButton(if (busy) "Saving…" else "I agree", enabled = !busy) {
            scope.launch {
                busy = true
                runCatching { session.agreeTerms() }.onFailure { error = it.message ?: "Couldn’t save your agreement. Try again." }
                busy = false
            }
        }
    }
}

@Composable
fun PickHandleScreen(session: SessionRepository) {
    val scope = rememberCoroutineScope()
    var handle by remember { mutableStateOf("") }
    var status by remember { mutableStateOf<String?>(null) }
    var available by remember { mutableStateOf<Boolean?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val cleaned = handle.trim().lowercase()
    val formatOk = Regex("^[a-z0-9_]{3,20}$").matches(cleaned)

    LaunchedEffect(cleaned) {
        available = null
        if (!formatOk) {
            status = if (cleaned.isEmpty()) null else "3–20 lowercase letters, numbers, or underscore"
            return@LaunchedEffect
        }
        status = "Checking…"
        delay(350)
        runCatching { session.handleAvailable(cleaned) }
            .onSuccess {
                available = it
                status = if (it) "Available" else "Taken"
            }
            .onFailure { status = "Couldn’t check" }
    }

    Column(Modifier.fillMaxSize().background(UnearthColor.FormBackground).statusBarsPadding().padding(24.dp)) {
        UnearthLogo(64.dp, Modifier.align(Alignment.CenterHorizontally))
        Spacer(Modifier.height(24.dp))
        Text("Pick a handle", fontFamily = Bricolage, fontWeight = FontWeight.Bold, fontSize = 22.sp, color = UnearthColor.Ink)
        Spacer(Modifier.height(8.dp))
        Text("This is how other prospectors will find you when you Unearth gems.", fontFamily = DmSans, fontSize = 15.sp, color = UnearthColor.InkSecondary, lineHeight = 22.5.sp)
        Spacer(Modifier.height(24.dp))
        Text("Handle", fontFamily = DmSans, fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = UnearthColor.Ink)
        Spacer(Modifier.height(6.dp))
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text("@", fontFamily = DmSans, color = UnearthColor.InkSecondary)
            UnearthField(handle, { handle = it.lowercase() }, "yourhandle")
        }
        if (status != null) {
            Text(status!!, fontFamily = DmSans, fontSize = 13.sp, color = if (available == true) UnearthColor.Green else UnearthColor.Amber)
        }
        if (error != null) Text(error!!, color = UnearthColor.Amber, fontFamily = DmSans, fontSize = 14.sp)
        Spacer(Modifier.weight(1f))
        PrimaryButton("Continue", enabled = formatOk && available == true && !busy) {
            scope.launch {
                busy = true
                runCatching { session.setHandle(cleaned) }.onFailure { error = it.message }
                busy = false
            }
        }
    }
}

@Composable
fun LocationExplainerScreen(session: SessionRepository) {
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {
        session.finishLocationExplainer()
    }
    Column(Modifier.fillMaxSize().background(UnearthColor.FormBackground).statusBarsPadding().padding(24.dp)) {
        UnearthLogo(64.dp, Modifier.align(Alignment.CenterHorizontally))
        Spacer(Modifier.height(24.dp))
        Text("Enable location for Dig", fontFamily = Bricolage, fontWeight = FontWeight.Bold, fontSize = 22.sp, color = UnearthColor.Ink)
        Spacer(Modifier.height(8.dp))
        Text(
            "Unearth needs your location while you Dig to show nearby gems, sort by distance, and place an accurate pin when you Unearth. We only use location while the app is open — never in the background.",
            fontFamily = DmSans, fontSize = 15.sp, color = UnearthColor.InkSecondary, lineHeight = 22.5.sp,
        )
        Spacer(Modifier.height(24.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(56.dp).clip(RoundedCornerShape(14.dp)).background(UnearthColor.GreenTint), contentAlignment = Alignment.Center) {
                Icon(Icons.Rounded.Map, contentDescription = null, tint = UnearthColor.Green)
            }
            Column {
                Text("Dig map", fontFamily = Bricolage, fontWeight = FontWeight.Bold, fontSize = 18.sp, color = UnearthColor.Ink)
                Text("See gems around you and center on your spot.", fontFamily = DmSans, fontSize = 14.sp, color = UnearthColor.InkSecondary)
            }
        }
        Spacer(Modifier.weight(1f))
        PrimaryButton("Allow location") {
            launcher.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION))
        }
        Spacer(Modifier.height(12.dp))
        OutlineButton("Not now") { session.finishLocationExplainer() }
    }
}
