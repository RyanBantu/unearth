package app.unearth.data.model

import androidx.compose.ui.graphics.Color
import app.unearth.ui.theme.UnearthColor
import kotlinx.serialization.Serializable

enum class Category(val api: String, val display: String, val chip: String) {
    Food("food", "Food", "Food"),
    Cafe("cafe", "Café", "Cafés"),
    Viewpoint("viewpoint", "Viewpoint", "Viewpoints"),
    Trail("trail", "Trail", "Trails"),
    Shop("shop", "Shop", "Shops"),
    Other("other", "Other", "Other");

    val pinColor: Color
        get() = if (this == Food || this == Cafe) UnearthColor.Green else UnearthColor.AmberPin

    companion object {
        val digFilters = listOf(Food, Cafe, Viewpoint, Trail, Shop)
        fun fromApi(value: String) = entries.find { it.api == value } ?: Other
    }
}

enum class GemStatus(val label: String) {
    Uncut("Uncut"),
    Polished("Polished"),
    Rare("Rare"),
    MinedOut("Mined out");

    companion object {
        fun badges(findCount: Int): List<GemStatus> = buildList {
            add(if (findCount >= 3) Polished else Uncut)
            if (findCount >= 25) add(MinedOut) else if (findCount < 10) add(Rare)
        }
    }
}

enum class ProspectorLevel(val label: String) {
    Digger("Digger"),
    Prospector("Prospector"),
    Master("Master Prospector");

    companion object {
        fun from(finds: Int) = when {
            finds >= 50 -> Master
            finds >= 10 -> Prospector
            else -> Digger
        }
    }
}

val AllowedTags = listOf(
    "Cheap", "Cash only", "Quiet", "Mornings", "Late night",
    "Standing only", "Needs a vehicle", "Family friendly", "Great view", "Veg friendly",
)

@Serializable
data class UserDto(
    val id: String,
    val email: String? = null,
    val displayName: String? = null,
    val handle: String? = null,
    val agreedTermsAt: String? = null,
    val needsTerms: Boolean? = null,
    val gemsUnearthed: Int? = null,
    val firstFinds: Int? = null,
    val level: String? = null,
    val finds: List<FindDto>? = null,
)

@Serializable
data class AuthTokensDto(
    val accessToken: String,
    val refreshToken: String,
    val user: UserDto,
    val needsHandle: Boolean? = null,
    val needsTerms: Boolean? = null,
)

@Serializable
data class StatusDto(
    val findCount: Int = 0,
    val primary: String? = null,
    val rare: Boolean = false,
    val minedOut: Boolean = false,
    val labels: List<String> = emptyList(),
)

@Serializable
data class FindDto(
    val id: String,
    val gemId: String? = null,
    val gemName: String? = null,
    val gemSlug: String? = null,
    val userId: String? = null,
    val handle: String? = null,
    val description: String? = null,
    val liked: String? = null,
    val disliked: String? = null,
    val tags: List<String> = emptyList(),
    val createdAt: String? = null,
    val isFirstFind: Boolean = false,
    val gemFindCount: Int? = null,
)

@Serializable
data class GemDto(
    val id: String,
    val slug: String? = null,
    val name: String,
    val category: String,
    val address: String? = null,
    val applePlaceId: String? = null,
    val googlePlaceId: String? = null,
    val googleMapsUrl: String? = null,
    val firstFinderId: String? = null,
    val firstFinderHandle: String? = null,
    val findCount: Int = 0,
    val lat: Double = 0.0,
    val lng: Double = 0.0,
    val distanceM: Double? = null,
    val upvotes: Int = 0,
    val downvotes: Int = 0,
    val myVote: Int? = null,
    val isStashed: Boolean = false,
    val myFindId: String? = null,
    val status: StatusDto? = null,
    val finds: List<FindDto> = emptyList(),
    val createdAt: String? = null,
)

@Serializable
data class NearbyDto(val gems: List<GemDto> = emptyList())

@Serializable
data class MatchCandidateDto(
    val id: String,
    val slug: String? = null,
    val name: String,
    val category: String,
    val findCount: Int = 0,
    val distanceM: Double = 0.0,
    val nameSim: Double = 0.0,
    val lat: Double? = null,
    val lng: Double? = null,
    val address: String? = null,
)

@Serializable
data class MatchDto(val candidates: List<MatchCandidateDto> = emptyList())

@Serializable
data class VoteDto(val upvotes: Int, val downvotes: Int, val myVote: Int? = null)

@Serializable
data class StashDto(val gems: List<GemDto> = emptyList())

@Serializable
data class ActivityEventDto(
    val id: String? = null,
    val type: String? = null,
    val gemId: String? = null,
    val gemName: String? = null,
    val actorHandle: String? = null,
    val createdAt: String? = null,
    val message: String? = null,
)

@Serializable
data class ActivityDto(val events: List<ActivityEventDto> = emptyList())

@Serializable
data class HandleAvailableDto(val available: Boolean)

@Serializable
data class ApiErrorDto(val error: String? = null, val candidates: List<MatchCandidateDto>? = null)

fun formatDistance(meters: Double): String =
    if (meters < 1000) "${meters.toInt()} m" else "%.1f km".format(meters / 1000)

fun relativeTime(iso: String?): String {
    if (iso.isNullOrBlank()) return ""
    return try {
        val normalized = iso.trim().replace(" ", "T").let { v ->
            when {
                v.endsWith("Z") || v.contains('+') || Regex("T.*-\\d{2}:\\d{2}$").containsMatchIn(v) -> v
                else -> "${v}Z"
            }
        }
        val then = java.time.Instant.parse(normalized)
        val mins = java.time.Duration.between(then, java.time.Instant.now()).toMinutes().coerceAtLeast(0)
        when {
            mins < 1 -> "just now"
            mins < 60 -> "${mins}m ago"
            mins < 1_440 -> "${mins / 60}h ago"
            else -> "${mins / 1_440}d ago"
        }
    } catch (_: Exception) {
        iso
    }
}

fun unearthedLine(gem: GemDto): String {
    val handles = gem.finderHandles()
    val count = gem.effectiveFindCount().coerceAtLeast(handles.size)
    val handle = gem.firstFinderHandle ?: handles.firstOrNull()
    return if (count <= 1 && handle != null) "Unearthed by @$handle"
    else "Unearthed independently by $count people"
}

fun GemDto.effectiveFindCount(): Int = status?.findCount?.takeIf { it > 0 } ?: findCount.coerceAtLeast(finds.size)

fun GemDto.finderHandles(): List<String> = finds.mapNotNull { it.handle }.distinct()

fun GemDto.firstFind(): FindDto? =
    finds.firstOrNull { it.isFirstFind } ?: finds.minByOrNull { it.createdAt.orEmpty() }

fun GemDto.otherFinds(): List<FindDto> {
    val first = firstFind() ?: return finds
    return finds.filter { it.id != first.id }
}

fun GemDto.likedNotes(): List<String> = finds.mapNotNull { it.liked?.takeIf(String::isNotBlank) }

fun GemDto.dislikedNotes(): List<String> = finds.mapNotNull { it.disliked?.takeIf(String::isNotBlank) }

fun GemDto.mergedTags(): List<String> {
    val counts = finds.flatMap { it.tags }.groupingBy { it }.eachCount()
    return counts.keys.sortedByDescending { counts[it] ?: 0 }
}

fun isValidGoogleMapsUrl(value: String): Boolean {
    if (value.isBlank()) return true
    val t = value.trim().lowercase()
    return t.contains("google.com/maps") || t.contains("maps.google.") ||
        t.contains("maps.app.goo.gl") || t.contains("goo.gl/maps")
}
