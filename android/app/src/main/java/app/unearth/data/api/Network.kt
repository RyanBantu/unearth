package app.unearth.data.api

import app.unearth.BuildConfig
import app.unearth.data.auth.TokenStore
import app.unearth.data.model.ApiErrorDto
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import java.util.concurrent.TimeUnit
import javax.inject.Singleton
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.json.Json
import okhttp3.Authenticator
import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

val AppJson = Json {
    ignoreUnknownKeys = true
    isLenient = true
    encodeDefaults = false
}

class TokenAuthenticator(
    private val tokens: TokenStore,
    private val json: Json,
) : Authenticator {
    @Volatile private var refreshClient: OkHttpClient? = null

    fun attach(client: OkHttpClient) {
        refreshClient = client.newBuilder().authenticator(Authenticator.NONE).build()
    }

    override fun authenticate(route: Route?, response: Response): Request? {
        if (responseCount(response) >= 2) return null
        val refresh = runBlocking { tokens.refresh() } ?: return null
        val body = json.encodeToString(RefreshBody.serializer(), RefreshBody(refresh))
            .toRequestBody("application/json".toMediaType())
        val req = Request.Builder()
            .url("${BuildConfig.API_BASE_URL.trimEnd('/')}/auth/refresh")
            .post(body)
            .build()
        val res = (refreshClient ?: return null).newCall(req).execute()
        if (!res.isSuccessful) {
            runBlocking { tokens.clear() }
            return null
        }
        val dto = json.decodeFromString(
            app.unearth.data.model.AuthTokensDto.serializer(),
            res.body?.string().orEmpty(),
        )
        runBlocking { tokens.save(dto.accessToken, dto.refreshToken) }
        return response.request.newBuilder()
            .header("Authorization", "Bearer ${dto.accessToken}")
            .build()
    }

    private fun responseCount(response: Response): Int {
        var r: Response? = response
        var n = 1
        while (r?.priorResponse != null) {
            n++
            r = r.priorResponse
        }
        return n
    }
}

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    @Provides @Singleton
    fun json(): Json = AppJson

    @Provides @Singleton
    fun api(tokens: TokenStore, json: Json): UnearthApi {
        val auth = TokenAuthenticator(tokens, json)
        val logging = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) HttpLoggingInterceptor.Level.BASIC
            else HttpLoggingInterceptor.Level.NONE
        }
        val header = Interceptor { chain ->
            val access = runBlocking { tokens.access() }
            val b = chain.request().newBuilder()
            if (access != null) b.header("Authorization", "Bearer $access")
            chain.proceed(b.build())
        }
        val client = OkHttpClient.Builder()
            .connectTimeout(20, TimeUnit.SECONDS)
            .readTimeout(20, TimeUnit.SECONDS)
            .addInterceptor(header)
            .authenticator(auth)
            .addInterceptor(logging)
            .build()
        auth.attach(client)
        return Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL.trimEnd('/') + "/")
            .client(client)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
            .create(UnearthApi::class.java)
    }
}

fun parseApiError(raw: String?): ApiErrorDto? = try {
    AppJson.decodeFromString(ApiErrorDto.serializer(), raw.orEmpty())
} catch (_: Exception) {
    null
}
