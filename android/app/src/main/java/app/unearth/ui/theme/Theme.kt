package app.unearth.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.material3.Typography
import androidx.compose.runtime.Composable
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

private val UnearthScheme = lightColorScheme(
    primary = UnearthColor.Green,
    onPrimary = UnearthColor.Surface,
    primaryContainer = UnearthColor.GreenTint,
    onPrimaryContainer = UnearthColor.Green,
    secondary = UnearthColor.AmberPin,
    onSecondary = UnearthColor.Surface,
    background = UnearthColor.FormBackground,
    onBackground = UnearthColor.Ink,
    surface = UnearthColor.Surface,
    onSurface = UnearthColor.Ink,
    onSurfaceVariant = UnearthColor.InkSecondary,
    outline = UnearthColor.Border,
    error = UnearthColor.Amber,
    onError = UnearthColor.Surface,
)

private val UnearthTypography = Typography(
    displayLarge = TextStyle(fontFamily = Bricolage, fontWeight = FontWeight.Bold, fontSize = 40.sp, lineHeight = 44.sp),
    headlineLarge = TextStyle(fontFamily = Bricolage, fontWeight = FontWeight.Bold, fontSize = 28.sp, lineHeight = 31.sp),
    headlineMedium = TextStyle(fontFamily = Bricolage, fontWeight = FontWeight.Bold, fontSize = 22.sp, lineHeight = 26.sp),
    titleLarge = TextStyle(fontFamily = Bricolage, fontWeight = FontWeight.Bold, fontSize = 18.sp, lineHeight = 22.sp),
    bodyLarge = TextStyle(fontFamily = DmSans, fontWeight = FontWeight.Normal, fontSize = 15.sp, lineHeight = 22.5.sp),
    bodyMedium = TextStyle(fontFamily = DmSans, fontWeight = FontWeight.Normal, fontSize = 14.sp, lineHeight = 20.sp),
    labelLarge = TextStyle(fontFamily = DmSans, fontWeight = FontWeight.SemiBold, fontSize = 16.sp),
    labelMedium = TextStyle(fontFamily = DmSans, fontWeight = FontWeight.SemiBold, fontSize = 13.sp),
    labelSmall = TextStyle(fontFamily = DmSans, fontWeight = FontWeight.SemiBold, fontSize = 12.sp),
)

@Composable
fun UnearthTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = UnearthScheme,
        typography = UnearthTypography,
        content = content,
    )
}
