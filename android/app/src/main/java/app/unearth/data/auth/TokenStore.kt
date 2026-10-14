package app.unearth.data.auth

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import javax.inject.Inject
import javax.inject.Singleton
import kotlinx.coroutines.flow.first

private val Context.tokenDataStore by preferencesDataStore("unearth_tokens")

@Singleton
class TokenStore @Inject constructor(
    @ApplicationContext private val context: Context,
) {
    private val accessKey = stringPreferencesKey("access")
    private val refreshKey = stringPreferencesKey("refresh")

    suspend fun save(access: String, refresh: String) {
        context.tokenDataStore.edit {
            it[accessKey] = encrypt(access)
            it[refreshKey] = encrypt(refresh)
        }
    }

    suspend fun access(): String? = context.tokenDataStore.data.first()[accessKey]?.let(::decrypt)
    suspend fun refresh(): String? = context.tokenDataStore.data.first()[refreshKey]?.let(::decrypt)

    suspend fun clear() {
        context.tokenDataStore.edit { it.clear() }
    }

    private fun secretKey(): SecretKey {
        val ks = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (ks.getKey(ALIAS, null) as? SecretKey)?.let { return it }
        val gen = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        gen.init(
            KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .build(),
        )
        return gen.generateKey()
    }

    private fun encrypt(plain: String): String {
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, secretKey())
        val iv = cipher.iv
        val bytes = cipher.doFinal(plain.toByteArray(Charsets.UTF_8))
        return Base64.encodeToString(iv + bytes, Base64.NO_WRAP)
    }

    private fun decrypt(blob: String): String {
        val raw = Base64.decode(blob, Base64.NO_WRAP)
        val iv = raw.copyOfRange(0, 12)
        val data = raw.copyOfRange(12, raw.size)
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.DECRYPT_MODE, secretKey(), GCMParameterSpec(128, iv))
        return String(cipher.doFinal(data), Charsets.UTF_8)
    }

    companion object {
        private const val ALIAS = "unearth_token_key"
        private const val TRANSFORMATION = "AES/GCM/NoPadding"
    }
}
