package app.unearth.data.session

import android.content.Context
import androidx.credentials.ClearCredentialStateRequest
import androidx.credentials.CredentialManager
import app.unearth.BuildConfig
import app.unearth.data.api.DevAuthBody
import app.unearth.data.api.HandleBody
import app.unearth.data.api.IdTokenBody
import app.unearth.data.api.RefreshBody
import app.unearth.data.api.UnearthApi
import app.unearth.data.auth.TokenStore
import app.unearth.data.model.UserDto
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

enum class SessionStep { Loading, SignedOut, NeedsTerms, NeedsHandle, NeedsLocation, Ready }

data class SessionState(
    val step: SessionStep = SessionStep.Loading,
    val user: UserDto? = null,
    val error: String? = null,
)

@Singleton
class SessionRepository @Inject constructor(
    private val api: UnearthApi,
    private val tokens: TokenStore,
    @ApplicationContext private val context: Context,
) {
    private val _state = MutableStateFlow(SessionState())
    val state: StateFlow<SessionState> = _state.asStateFlow()

    suspend fun bootstrap() {
        val access = tokens.access()
        if (access.isNullOrBlank()) {
            _state.value = SessionState(SessionStep.SignedOut)
            return
        }
        try {
            applyUser(api.me())
        } catch (_: Exception) {
            tokens.clear()
            _state.value = SessionState(SessionStep.SignedOut)
        }
    }

    suspend fun signInGoogle(idToken: String) {
        val dto = api.authGoogle(IdTokenBody(idToken))
        tokens.save(dto.accessToken, dto.refreshToken)
        applyUser(dto.user, dto.needsHandle, dto.needsTerms)
    }

    suspend fun signInDev(handle: String = "androiddev") {
        check(BuildConfig.ALLOW_DEV_SIGN_IN) { "Dev sign-in is not in this build" }
        val dto = api.authDev(DevAuthBody(handle))
        tokens.save(dto.accessToken, dto.refreshToken)
        applyUser(dto.user, dto.needsHandle, dto.needsTerms)
    }

    suspend fun agreeTerms() {
        applyUser(api.agreeTerms())
    }

    suspend fun setHandle(handle: String) {
        val user = api.setHandle(HandleBody(handle))
        _state.value = SessionState(SessionStep.NeedsLocation, user)
    }

    suspend fun handleAvailable(handle: String) = api.handleAvailable(handle).available

    suspend fun signOut() {
        tokens.refresh()?.let { runCatching { api.logout(RefreshBody(it)) } }
        tokens.clear()
        runCatching {
            CredentialManager.create(context).clearCredentialState(ClearCredentialStateRequest())
        }
        _state.value = SessionState(SessionStep.SignedOut)
    }

    suspend fun deleteAccount() {
        runCatching { api.deleteAccount() }
        tokens.clear()
        runCatching {
            CredentialManager.create(context).clearCredentialState(ClearCredentialStateRequest())
        }
        _state.value = SessionState(SessionStep.SignedOut)
    }

    fun finishLocationExplainer() {
        val u = _state.value.user ?: return
        _state.value = SessionState(SessionStep.Ready, u)
    }

    private fun applyUser(
        user: UserDto,
        needsHandle: Boolean? = null,
        needsTerms: Boolean? = null,
    ) {
        val terms = needsTerms ?: user.needsTerms ?: user.agreedTermsAt.isNullOrBlank()
        val handle = needsHandle ?: user.handle.isNullOrBlank()
        val step = when {
            terms -> SessionStep.NeedsTerms
            handle -> SessionStep.NeedsHandle
            else -> SessionStep.Ready
        }
        _state.value = SessionState(step, user)
    }
}
