import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.ksp)
    alias(libs.plugins.hilt)
    alias(libs.plugins.secrets)
}

val localProperties = Properties().apply {
    val f = rootProject.file("local.properties")
    if (f.exists()) f.inputStream().use(::load)
}

android {
    namespace = "app.unearth"
    compileSdk = 36

    defaultConfig {
        applicationId = "app.unearth"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "1.0.0"
        vectorDrawables.useSupportLibrary = true

        buildConfigField("String", "SITE_URL", "\"https://unearth.vercel.app\"")
        val webClientId = localProperties.getProperty("GOOGLE_WEB_CLIENT_ID") ?: ""
        buildConfigField("String", "GOOGLE_WEB_CLIENT_ID", "\"$webClientId\"")
    }

    buildTypes {
        debug {
            // Same as iOS DEBUG: production unless DEBUG_API_BASE_URL is set (local opt-in).
            val debugApi = localProperties.getProperty("DEBUG_API_BASE_URL")
                ?: "https://unearth-1o4a.onrender.com"
            val usingLocalApi = listOf("10.0.2.2", "localhost", "127.0.0.1").any { debugApi.contains(it) }
            buildConfigField("String", "API_BASE_URL", "\"$debugApi\"")
            buildConfigField("boolean", "ALLOW_DEV_SIGN_IN", if (usingLocalApi) "true" else "false")
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
            buildConfigField("String", "API_BASE_URL", "\"https://unearth-1o4a.onrender.com\"")
            buildConfigField("boolean", "ALLOW_DEV_SIGN_IN", "false")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures {
        compose = true
        buildConfig = true
    }
    packaging { resources.excludes += "/META-INF/{AL2.0,LGPL2.1}" }
}

secrets {
    propertiesFileName = "local.properties"
    defaultPropertiesFileName = "local.defaults.properties"
    ignoreList.add("sdk.dir")
    ignoreList.add("GOOGLE_WEB_CLIENT_ID")
    ignoreList.add("DEBUG_API_BASE_URL")
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    implementation(libs.google.material)
    implementation(libs.androidx.compose.material.icons)
    implementation(libs.androidx.navigation.compose)
    implementation(libs.androidx.lifecycle.runtime)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.lifecycle.viewmodel)
    implementation(libs.kotlinx.coroutines.play)
    implementation(libs.androidx.hilt.navigation)
    implementation(libs.androidx.datastore)
    implementation(libs.androidx.security.crypto)
    implementation(libs.androidx.browser)
    implementation(libs.hilt.android)
    ksp(libs.hilt.compiler)
    implementation(libs.retrofit)
    implementation(libs.retrofit.kotlinx)
    implementation(libs.okhttp)
    implementation(libs.okhttp.logging)
    implementation(libs.kotlinx.serialization.json)
    implementation(libs.credentials)
    implementation(libs.credentials.play)
    implementation(libs.googleid)
    implementation(libs.play.services.auth)
    implementation(libs.maps.compose)
    implementation(libs.play.services.maps)
    implementation(libs.places)
    implementation(libs.play.services.location)
    debugImplementation(libs.androidx.compose.ui.tooling)
}
