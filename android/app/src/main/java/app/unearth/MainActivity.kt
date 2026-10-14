package app.unearth

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.core.util.Consumer
import app.unearth.data.api.UnearthApi
import app.unearth.data.session.SessionRepository
import app.unearth.ui.UnearthRoot
import app.unearth.ui.theme.UnearthTheme
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    @Inject lateinit var session: SessionRepository
    @Inject lateinit var api: UnearthApi

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.light(android.graphics.Color.TRANSPARENT, android.graphics.Color.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.light(android.graphics.Color.TRANSPARENT, android.graphics.Color.TRANSPARENT),
        )
        setContent {
            UnearthTheme {
                val link = rememberDeepLink(this)
                UnearthRoot(session, api, link)
            }
        }
    }
}

@Composable
private fun rememberDeepLink(activity: ComponentActivity): String? {
    var slug by remember { mutableStateOf(activity.intent.gemSlug()) }
    DisposableEffect(activity) {
        val listener = Consumer<Intent> { slug = it.gemSlug() }
        activity.addOnNewIntentListener(listener)
        onDispose { activity.removeOnNewIntentListener(listener) }
    }
    return slug
}

private fun Intent.gemSlug(): String? {
    val data = data ?: return null
    if (data.host != "unearth.vercel.app") return null
    val parts = data.pathSegments ?: return null
    return if (parts.size >= 2 && parts[0] == "g") parts[1] else null
}
