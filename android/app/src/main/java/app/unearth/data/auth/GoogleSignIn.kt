package app.unearth.data.auth

import android.content.Context
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialCancellationException
import androidx.credentials.exceptions.GetCredentialException
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import app.unearth.BuildConfig

suspend fun requestGoogleIdToken(context: Context): String {
    check(BuildConfig.GOOGLE_WEB_CLIENT_ID.isNotBlank()) {
        "GOOGLE_WEB_CLIENT_ID is missing from local.properties"
    }
    val option = GetSignInWithGoogleOption.Builder(BuildConfig.GOOGLE_WEB_CLIENT_ID)
        .build()
    val request = GetCredentialRequest.Builder()
        .addCredentialOption(option)
        .build()
    val response = CredentialManager.create(context).getCredential(context, request)
    return GoogleIdTokenCredential.createFrom(response.credential.data).idToken
}

fun isGoogleCancel(err: Throwable) = err is GetCredentialCancellationException

fun googleSignInMessage(err: Throwable): String {
    val raw = (err as? GetCredentialException)?.errorMessage?.toString()
        ?: err.message
        ?: err::class.simpleName
        ?: "Sign in failed."
    return raw
}
