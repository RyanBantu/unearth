package app.unearth.ui.components

import androidx.compose.foundation.Canvas
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
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.Hiking
import androidx.compose.material.icons.outlined.Landscape
import androidx.compose.material.icons.outlined.LocalCafe
import androidx.compose.material.icons.outlined.Restaurant
import androidx.compose.material.icons.outlined.ShoppingBag
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Bookmark
import androidx.compose.material.icons.rounded.Map
import androidx.compose.material.icons.rounded.Notifications
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.ThumbDown
import androidx.compose.material.icons.rounded.ThumbUp
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import app.unearth.data.model.Category
import app.unearth.data.model.GemDto
import app.unearth.data.model.GemStatus
import app.unearth.data.model.formatDistance
import app.unearth.ui.theme.Bricolage
import app.unearth.ui.theme.DmSans
import app.unearth.ui.theme.UnearthColor
import app.unearth.ui.theme.UnearthTheme

@Composable
fun UnearthLogo(size: Dp, modifier: Modifier = Modifier) {
    Canvas(modifier.size(size).semantics { contentDescription = "Unearth logo" }) {
        val s = size.toPx() / 100f
        drawRoundRect(UnearthColor.GreenTint, cornerRadius = CornerRadius(22.5f * s))
        val u = Path().apply {
            moveTo(28f * s, 28f * s)
            lineTo(28f * s, 52f * s)
            cubicTo(28f * s, 64f * s, 38f * s, 74f * s, 50f * s, 74f * s)
            cubicTo(62f * s, 74f * s, 72f * s, 64f * s, 72f * s, 52f * s)
            lineTo(72f * s, 28f * s)
        }
        drawPath(u, UnearthColor.Green, style = Stroke(15f * s, cap = StrokeCap.Round))
        val gem = Path().apply {
            moveTo(39f * s, 44f * s)
            lineTo(44f * s, 37f * s)
            lineTo(56f * s, 37f * s)
            lineTo(61f * s, 44f * s)
            lineTo(50f * s, 57f * s)
            close()
        }
        drawPath(gem, UnearthColor.AmberPin)
    }
}

@Preview
@Composable
private fun LogoPreview() {
    UnearthTheme { UnearthLogo(112.dp, Modifier.padding(16.dp)) }
}

@Composable
fun PrimaryButton(
    title: String,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    large: Boolean = false,
    icon: ImageVector? = null,
    onClick: () -> Unit,
) {
    Box(
        modifier
            .fillMaxWidth()
            .height(if (large) 52.dp else 50.dp)
            .clip(RoundedCornerShape(14.dp))
            .background(if (enabled) UnearthColor.Green else UnearthColor.Green.copy(alpha = 0.5f))
            .clickable(enabled) { onClick() },
        contentAlignment = Alignment.Center,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            if (icon != null) Icon(icon, contentDescription = null, tint = UnearthColor.Surface, modifier = Modifier.size(18.dp))
            Text(title, color = UnearthColor.Surface, fontFamily = DmSans, fontWeight = FontWeight.SemiBold, fontSize = if (large) 17.sp else 16.sp)
        }
    }
}

@Composable
fun Avatar(handle: String, size: Dp, modifier: Modifier = Modifier) {
    Box(
        modifier
            .size(size)
            .clip(CircleShape)
            .background(UnearthColor.GreenTint),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            handle.take(1).uppercase(),
            color = UnearthColor.Green,
            fontFamily = DmSans,
            fontWeight = FontWeight.SemiBold,
            fontSize = (size.value * 0.4f).sp,
        )
    }
}

@Composable
fun OutlineButton(title: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Box(
        modifier
            .fillMaxWidth()
            .height(50.dp)
            .clip(RoundedCornerShape(14.dp))
            .border(1.dp, UnearthColor.Border, RoundedCornerShape(14.dp))
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(title, color = UnearthColor.Ink, fontFamily = DmSans, fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
    }
}

@Preview
@Composable
private fun ButtonsPreview() {
    UnearthTheme {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            PrimaryButton("I found it too") {}
            PrimaryButton("Unearth", large = true) {}
            OutlineButton("Not now") {}
        }
    }
}

@Composable
fun UnearthField(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    modifier: Modifier = Modifier,
    singleLine: Boolean = true,
    minHeight: Dp = 50.dp,
) {
    Box(
        modifier
            .fillMaxWidth()
            .height(minHeight)
            .border(1.dp, UnearthColor.FieldBorder, RoundedCornerShape(12.dp))
            .padding(horizontal = 14.dp, vertical = 12.dp),
        contentAlignment = Alignment.TopStart,
    ) {
        if (value.isEmpty()) {
            Text(placeholder, color = UnearthColor.InkSecondary, fontFamily = DmSans, fontSize = 15.sp)
        }
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            singleLine = singleLine,
            textStyle = androidx.compose.ui.text.TextStyle(color = UnearthColor.Ink, fontFamily = DmSans, fontSize = 15.sp),
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

@Composable
fun UnearthChip(title: String, selected: Boolean, onClick: () -> Unit) {
    Text(
        title,
        modifier = Modifier
            .clip(RoundedCornerShape(18.dp))
            .background(if (selected) UnearthColor.Ink else UnearthColor.Surface)
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 8.dp),
        color = if (selected) UnearthColor.Surface else UnearthColor.Ink,
        fontFamily = DmSans,
        fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Medium,
        fontSize = 14.sp,
    )
}

@Composable
fun CategoryChip(
    category: Category,
    selected: Boolean,
    form: Boolean = false,
    onClick: () -> Unit,
) {
    UnearthChip(if (form) category.display else category.chip, selected, onClick)
}

@Composable
fun StatusBadge(status: GemStatus) {
    val (bg, fg) = when (status) {
        GemStatus.Polished -> UnearthColor.GreenTint to UnearthColor.Green
        GemStatus.Rare -> UnearthColor.AmberTint to UnearthColor.AmberDeep
        GemStatus.Uncut -> UnearthColor.NeutralChip to UnearthColor.InkTertiary
        GemStatus.MinedOut -> UnearthColor.FormBackground to UnearthColor.InkSecondary
    }
    Text(
        status.label,
        modifier = Modifier
            .clip(RoundedCornerShape(8.dp))
            .background(bg)
            .padding(horizontal = 8.dp, vertical = 4.dp),
        color = fg,
        fontFamily = DmSans,
        fontWeight = FontWeight.SemiBold,
        fontSize = 12.sp,
    )
}

@Preview
@Composable
private fun BadgePreview() {
    UnearthTheme {
        Row(Modifier.padding(16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            GemStatus.entries.forEach { StatusBadge(it) }
        }
    }
}

@Composable
fun GemPin(category: Category, selected: Boolean, modifier: Modifier = Modifier) {
    val pinSize = if (selected) 52.dp else 36.dp
    val border = if (selected) 4.dp else 3.dp
    Box(
        modifier
            .size(pinSize)
            .shadow(6.dp, CircleShape)
            .clip(CircleShape)
            .background(category.pinColor)
            .border(border, UnearthColor.Surface, CircleShape)
            .semantics { contentDescription = "${category.display} gem pin" },
        contentAlignment = Alignment.Center,
    ) {
        if (selected) {
            Canvas(Modifier.size(22.dp)) {
                val p = Path().apply {
                    moveTo(this@Canvas.size.width / 2, 2.dp.toPx())
                    lineTo(this@Canvas.size.width - 2.dp.toPx(), this@Canvas.size.height / 2)
                    lineTo(this@Canvas.size.width / 2, this@Canvas.size.height - 2.dp.toPx())
                    lineTo(2.dp.toPx(), this@Canvas.size.height / 2)
                    close()
                }
                drawPath(p, Color.White)
            }
        }
    }
}

@Preview
@Composable
private fun PinPreview() {
    UnearthTheme {
        Row(Modifier.padding(16.dp), horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            GemPin(Category.Food, false)
            GemPin(Category.Viewpoint, true)
        }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun GemCard(gem: GemDto, onClick: () -> Unit) {
    val cat = Category.fromApi(gem.category)
    Row(
        Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .clickable(onClick = onClick)
            .padding(4.dp),
        verticalAlignment = Alignment.Top,
    ) {
        Box(
            Modifier.size(72.dp).clip(RoundedCornerShape(18.dp)).background(UnearthColor.GreenTint),
            contentAlignment = Alignment.Center,
        ) {
            Icon(categoryIcon(cat), contentDescription = cat.display, tint = UnearthColor.Green, modifier = Modifier.size(30.dp))
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(gem.name, fontFamily = Bricolage, fontWeight = FontWeight.Bold, fontSize = 18.sp, color = UnearthColor.Ink, maxLines = 2, overflow = TextOverflow.Ellipsis)
            val dist = gem.distanceM?.let { " · ${formatDistance(it)} away" } ?: ""
            Text("${cat.display}$dist", fontFamily = DmSans, fontSize = 14.sp, color = UnearthColor.InkSecondary)
            Spacer(Modifier.height(6.dp))
            FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                GemStatus.badges(gem.findCount).forEach { StatusBadge(it) }
                if (gem.upvotes + gem.downvotes > 0) {
                    Text("👍 ${gem.upvotes - gem.downvotes}", fontFamily = DmSans, fontSize = 12.sp, color = UnearthColor.InkSecondary)
                }
            }
        }
    }
}

@Composable
fun VoteRow(
    upvotes: Int,
    downvotes: Int,
    myVote: Int?,
    canVote: Boolean,
    onUp: () -> Unit,
    onDown: () -> Unit,
) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(16.dp)) {
        IconButton(onClick = onUp, enabled = canVote, modifier = Modifier.semantics { contentDescription = "Thumbs up" }) {
            Icon(Icons.Rounded.ThumbUp, contentDescription = null, tint = if (myVote == 1) UnearthColor.Green else UnearthColor.InkSecondary)
        }
        Text("$upvotes", fontFamily = DmSans, color = UnearthColor.Ink)
        IconButton(onClick = onDown, enabled = canVote, modifier = Modifier.semantics { contentDescription = "Thumbs down" }) {
            Icon(Icons.Rounded.ThumbDown, contentDescription = null, tint = if (myVote == -1) UnearthColor.Amber else UnearthColor.InkSecondary)
        }
        Text("$downvotes", fontFamily = DmSans, color = UnearthColor.Ink)
    }
}

@Composable
fun ScreenLoading(message: String = "Loading…") {
    Column(Modifier.fillMaxWidth().padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        CircularProgressIndicator(color = UnearthColor.Green)
        Spacer(Modifier.height(12.dp))
        Text(message, fontFamily = DmSans, color = UnearthColor.InkSecondary)
    }
}

@Composable
fun ScreenEmpty(title: String, message: String) {
    Column(Modifier.fillMaxWidth().padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Text(title, fontFamily = Bricolage, fontWeight = FontWeight.Bold, fontSize = 22.sp, color = UnearthColor.Ink)
        Spacer(Modifier.height(8.dp))
        Text(message, fontFamily = DmSans, color = UnearthColor.InkSecondary)
    }
}

@Composable
fun ScreenError(message: String, onRetry: () -> Unit) {
    Column(Modifier.fillMaxWidth().padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Text("Couldn’t load this.", fontFamily = Bricolage, fontWeight = FontWeight.Bold, fontSize = 22.sp, color = UnearthColor.Ink)
        Spacer(Modifier.height(8.dp))
        Text(message, fontFamily = DmSans, color = UnearthColor.InkSecondary)
        TextButton(onClick = onRetry) { Text("Try again", color = UnearthColor.Green, fontFamily = DmSans, fontWeight = FontWeight.SemiBold) }
    }
}

enum class MainTab { Dig, Stash, Unearth, Activity, Profile }

@Composable
fun UnearthTabBar(
    selected: MainTab,
    onSelect: (MainTab) -> Unit,
    onUnearth: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier.fillMaxWidth().background(UnearthColor.Surface)) {
        Box(Modifier.fillMaxWidth().height(1.dp).background(UnearthColor.Divider))
        Row(
            Modifier
                .fillMaxWidth()
                .height(84.dp)
                .padding(horizontal = 8.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
        TabItem("Dig", Icons.Rounded.Map, selected == MainTab.Dig, Modifier.weight(1f)) { onSelect(MainTab.Dig) }
        TabItem("Stash", Icons.Rounded.Bookmark, selected == MainTab.Stash, Modifier.weight(1f)) { onSelect(MainTab.Stash) }
        Box(
            Modifier
                .width(56.dp)
                .height(48.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(UnearthColor.Green)
                .clickable(onClick = onUnearth)
                .semantics { contentDescription = "Unearth a gem" },
            contentAlignment = Alignment.Center,
        ) {
            Icon(Icons.Rounded.Add, contentDescription = null, tint = UnearthColor.Surface)
        }
        TabItem("Activity", Icons.Rounded.Notifications, selected == MainTab.Activity, Modifier.weight(1f)) { onSelect(MainTab.Activity) }
        TabItem("Profile", Icons.Rounded.Person, selected == MainTab.Profile, Modifier.weight(1f)) { onSelect(MainTab.Profile) }
        }
    }
}

@Composable
private fun TabItem(title: String, icon: ImageVector, active: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Column(
        modifier
            .clickable(onClick = onClick)
            .padding(vertical = 4.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(icon, contentDescription = title, tint = if (active) UnearthColor.Green else UnearthColor.InkSecondary, modifier = Modifier.size(22.dp))
        Text(title, fontFamily = DmSans, fontWeight = if (active) FontWeight.SemiBold else FontWeight.Medium, fontSize = 11.sp, color = if (active) UnearthColor.Green else UnearthColor.InkSecondary)
    }
}

fun categoryIcon(category: Category): ImageVector = when (category) {
    Category.Food -> Icons.Outlined.Restaurant
    Category.Cafe -> Icons.Outlined.LocalCafe
    Category.Viewpoint -> Icons.Outlined.Landscape
    Category.Trail -> Icons.Outlined.Hiking
    Category.Shop -> Icons.Outlined.ShoppingBag
    Category.Other -> Icons.Outlined.AutoAwesome
}

@Preview
@Composable
private fun TabPreview() {
    UnearthTheme { UnearthTabBar(MainTab.Dig, {}, {}) }
}

@Preview
@Composable
private fun ChipVotePreview() {
    UnearthTheme {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Category.digFilters.forEach { CategoryChip(it, it == Category.Food) {} }
            }
            VoteRow(12, 2, 1, true, {}, {})
        }
    }
}
