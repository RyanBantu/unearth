package app.unearth.ui.share

import android.app.Activity
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.ComposeView
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.ViewCompositionStrategy
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.FileProvider
import app.unearth.BuildConfig
import app.unearth.data.model.Category
import app.unearth.ui.components.OutlineButton
import app.unearth.ui.components.PrimaryButton
import app.unearth.ui.components.UnearthLogo
import app.unearth.ui.theme.Bricolage
import app.unearth.ui.theme.DmSans
import app.unearth.ui.theme.UnearthColor
import app.unearth.ui.theme.UnearthTheme
import java.io.File

data class ShareOffer(
    val message: String,
    val gemName: String,
    val category: String,
    val handle: String,
    val slug: String?,
)

@Composable
fun ShareCardContent(name: String, category: String, handle: String) {
    Column(
        Modifier
            .size(width = 360.dp, height = 640.dp)
            .background(UnearthColor.GreenTint)
            .padding(32.dp),
    ) {
        Row {
            UnearthLogo(48.dp)
            Spacer(Modifier.weight(1f))
            Text("Unearth", fontFamily = Bricolage, fontWeight = FontWeight.Bold, fontSize = 22.sp, color = UnearthColor.Green)
        }
        Spacer(Modifier.height(28.dp))
        Box(
            Modifier
                .fillMaxWidth()
                .height(220.dp)
                .clip(RoundedCornerShape(20.dp))
                .background(UnearthColor.Surface),
        ) {
            Canvas(Modifier.fillMaxSize()) {
                val step = 22.dp.toPx()
                var x = 0f
                while (x < size.width) {
                    drawLine(UnearthColor.Border, Offset(x, 0f), Offset(x, size.height), 2f)
                    x += step
                }
                var y = 0f
                while (y < size.height) {
                    drawLine(UnearthColor.Border, Offset(0f, y), Offset(size.width, y), 2f)
                    y += step
                }
                drawCircle(UnearthColor.Green, 16.dp.toPx(), Offset(size.width / 2, size.height / 2))
                drawCircle(UnearthColor.Surface, 16.dp.toPx(), Offset(size.width / 2, size.height / 2), style = Stroke(6.dp.toPx()))
            }
        }
        Spacer(Modifier.height(28.dp))
        Text(
            Category.fromApi(category).display.uppercase(),
            fontFamily = DmSans,
            fontWeight = FontWeight.SemiBold,
            fontSize = 13.sp,
            color = UnearthColor.Green,
            letterSpacing = 1.5.sp,
        )
        Spacer(Modifier.height(8.dp))
        Text(name, fontFamily = Bricolage, fontWeight = FontWeight.Bold, fontSize = 28.sp, color = UnearthColor.Ink)
        Spacer(Modifier.height(12.dp))
        Text("Unearthed by @$handle", fontFamily = DmSans, fontWeight = FontWeight.Medium, fontSize = 16.sp, color = UnearthColor.InkSecondary)
        Spacer(Modifier.weight(1f))
        Text("Find it on Unearth", fontFamily = DmSans, color = UnearthColor.InkTertiary)
    }
}

@Composable
fun ShareOfferScreen(offer: ShareOffer, onFinished: () -> Unit) {
    val context = LocalContext.current
    val activity = context as Activity
    val instagram = remember {
        context.packageManager.getLaunchIntentForPackage("com.instagram.android") != null
    }
    Column(
        Modifier
            .fillMaxSize()
            .background(UnearthColor.FormBackground)
            .statusBarsPadding()
            .padding(20.dp),
    ) {
        Text("Share your find", fontFamily = Bricolage, fontWeight = FontWeight.Bold, fontSize = 22.sp, color = UnearthColor.Ink)
        Spacer(Modifier.height(8.dp))
        Text(offer.message, fontFamily = DmSans, color = UnearthColor.InkSecondary)
        Spacer(Modifier.height(16.dp))
        Box(Modifier.weight(1f)) {
            ShareCardContent(offer.gemName, offer.category, offer.handle)
        }
        PrimaryButton("Share", large = true) { shareGemLink(context, offer.slug, offer.gemName) }
        if (instagram) {
            Spacer(Modifier.height(12.dp))
            OutlineButton("Instagram Stories") {
                val bmp = captureShareCard(activity, offer)
                if (bmp != null) shareToInstagramStories(context, bmp)
                else shareGemLink(context, offer.slug, offer.gemName)
            }
        }
        Spacer(Modifier.height(12.dp))
        Text(
            "Not now",
            color = UnearthColor.InkSecondary,
            fontFamily = DmSans,
            fontWeight = FontWeight.SemiBold,
            modifier = Modifier.padding(12.dp).clickable(onClick = onFinished),
        )
    }
}

fun shareGemLink(context: android.content.Context, slug: String?, name: String) {
    val url = slug?.let { "${BuildConfig.SITE_URL}/g/$it" } ?: BuildConfig.SITE_URL
    val send = Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_TEXT, "$name on Unearth\n$url")
    }
    context.startActivity(Intent.createChooser(send, "Share gem"))
}

fun shareToInstagramStories(context: android.content.Context, bitmap: Bitmap): Boolean {
    val file = File(context.cacheDir, "story.png")
    file.outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 92, it) }
    val uri = FileProvider.getUriForFile(context, "${context.packageName}.files", file)
    context.grantUriPermission("com.instagram.android", uri, Intent.FLAG_GRANT_READ_URI_PERMISSION)
    val intent = Intent("com.instagram.share.ADD_TO_STORY").apply {
        setDataAndType(uri, "image/png")
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        setPackage("com.instagram.android")
    }
    return if (intent.resolveActivity(context.packageManager) != null) {
        context.startActivity(intent)
        true
    } else false
}

private fun captureShareCard(activity: Activity, offer: ShareOffer): Bitmap? {
    return try {
        val width = 1080
        val height = 1920
        val composeView = ComposeView(activity).apply {
            setViewCompositionStrategy(ViewCompositionStrategy.DisposeOnDetachedFromWindow)
            setContent {
                UnearthTheme {
                    CompositionLocalProvider(LocalDensity provides Density(3f)) {
                        ShareCardContent(offer.gemName, offer.category, offer.handle)
                    }
                }
            }
        }
        val parent = FrameLayout(activity)
        parent.addView(composeView, ViewGroup.LayoutParams(width, height))
        val root = activity.window.decorView as ViewGroup
        root.addView(parent, ViewGroup.LayoutParams(1, 1))
        parent.measure(
            View.MeasureSpec.makeMeasureSpec(width, View.MeasureSpec.EXACTLY),
            View.MeasureSpec.makeMeasureSpec(height, View.MeasureSpec.EXACTLY),
        )
        parent.layout(0, 0, width, height)
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        parent.draw(Canvas(bitmap))
        root.removeView(parent)
        bitmap
    } catch (_: Exception) {
        null
    }
}

@Preview
@Composable
private fun ShareCardPreview() {
    UnearthTheme { ShareCardContent("Hidden Ramen Alley", "food", "ryan") }
}
