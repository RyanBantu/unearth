package app.unearth.data.api

import app.unearth.data.model.ActivityDto
import app.unearth.data.model.AuthTokensDto
import app.unearth.data.model.FindDto
import app.unearth.data.model.GemDto
import app.unearth.data.model.HandleAvailableDto
import app.unearth.data.model.MatchDto
import app.unearth.data.model.NearbyDto
import app.unearth.data.model.StashDto
import app.unearth.data.model.UserDto
import app.unearth.data.model.VoteDto
import kotlinx.serialization.Serializable
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query

interface UnearthApi {
    @POST("auth/google")
    suspend fun authGoogle(@Body body: IdTokenBody): AuthTokensDto

    @POST("auth/dev")
    suspend fun authDev(@Body body: DevAuthBody): AuthTokensDto

    @POST("auth/refresh")
    suspend fun refresh(@Body body: RefreshBody): AuthTokensDto

    @POST("auth/logout")
    suspend fun logout(@Body body: RefreshBody): Response<Unit>

    @GET("me")
    suspend fun me(): UserDto

    @POST("me/agree-terms")
    suspend fun agreeTerms(): UserDto

    @PUT("me/handle")
    suspend fun setHandle(@Body body: HandleBody): UserDto

    @GET("handles/{handle}/available")
    suspend fun handleAvailable(@Path("handle") handle: String): HandleAvailableDto

    @DELETE("me")
    suspend fun deleteAccount(): Response<Unit>

    @GET("gems/nearby")
    suspend fun nearby(
        @Query("lat") lat: Double,
        @Query("lng") lng: Double,
        @Query("radius_m") radiusM: Int = 5_000,
        @Query("category") category: String? = null,
    ): NearbyDto

    @GET("gems/match")
    suspend fun match(
        @Query("lat") lat: Double,
        @Query("lng") lng: Double,
        @Query("name") name: String,
        @Query("category") category: String,
        @Query("googlePlaceId") googlePlaceId: String? = null,
    ): MatchDto

    @GET("gems/{id}")
    suspend fun gem(@Path("id") id: String): GemDto

    @POST("gems")
    suspend fun createGem(@Body body: CreateGemBody): GemDto

    @POST("gems/{id}/finds")
    suspend fun createFind(@Path("id") id: String, @Body body: CreateFindBody): CreateFindResponse

    @PUT("gems/{id}/vote")
    suspend fun setVote(@Path("id") id: String, @Body body: VoteBody): VoteDto

    @DELETE("gems/{id}/vote")
    suspend fun clearVote(@Path("id") id: String): VoteDto

    @DELETE("finds/{id}")
    suspend fun deleteFind(@Path("id") id: String): DeleteFindResponse

    @GET("stash")
    suspend fun stash(): StashDto

    @PUT("stash/{id}")
    suspend fun addStash(@Path("id") id: String): Response<Unit>

    @DELETE("stash/{id}")
    suspend fun removeStash(@Path("id") id: String): Response<Unit>

    @GET("activity")
    suspend fun activity(): ActivityDto

    @POST("reports")
    suspend fun report(@Body body: ReportBody): Response<Unit>

    @POST("users/{id}/block")
    suspend fun block(@Path("id") id: String): Response<Unit>

    @DELETE("users/{id}/block")
    suspend fun unblock(@Path("id") id: String): Response<Unit>

    @GET("me/blocks")
    suspend fun blocks(): BlocksDto
}

@Serializable data class BlockedUserDto(
    val id: String,
    val handle: String? = null,
    val displayName: String? = null,
)

@Serializable data class IdTokenBody(val idToken: String)
@Serializable data class DevAuthBody(val handle: String? = null)
@Serializable data class RefreshBody(val refreshToken: String)
@Serializable data class HandleBody(val handle: String)
@Serializable data class VoteBody(val value: Int)
@Serializable data class CreateFindBody(
    val description: String,
    val liked: String? = null,
    val disliked: String? = null,
    val tags: List<String> = emptyList(),
)
@Serializable data class CreateGemBody(
    val name: String,
    val category: String,
    val lat: Double,
    val lng: Double,
    val description: String,
    val liked: String? = null,
    val disliked: String? = null,
    val tags: List<String> = emptyList(),
    val googlePlaceId: String? = null,
    val googleMapsUrl: String? = null,
    val address: String? = null,
    val confirmedNew: Boolean? = null,
)
@Serializable data class CreateFindResponse(val find: FindDto)
@Serializable data class DeleteFindResponse(val gemDeleted: Boolean = false)
@Serializable data class ReportBody(val gemId: String? = null, val findId: String? = null, val reason: String)
@Serializable data class BlocksDto(val blocks: List<BlockedUserDto> = emptyList())
