# Unearth for Android

Native Kotlin / Jetpack Compose client. Talks to the same Render API and Neon database as iOS.

Package name: `app.unearth` (debug builds use `app.unearth.debug`). **Do not change this after publishing.**

## Setup

1. Copy `local.properties.example` to `local.properties`.
2. Set `sdk.dir` to your Android SDK.
3. Put a Google Cloud **Maps SDK for Android + Places API (New)** key in `MAPS_API_KEY`. Restrict it to this package name + SHA-1, and never commit it.
4. Put the **Web** OAuth client ID in `GOOGLE_WEB_CLIENT_ID` (same value as Render `GOOGLE_WEB_CLIENT_ID`).
5. Create an Android OAuth client in Google Cloud for `app.unearth` (and one for `app.unearth.debug` if you test Google sign-in on debug builds). Add both SHA-1 fingerprints listed below.

```bash
cd android
./gradlew :app:assembleDebug
```

Debug and release both use `https://unearth-1o4a.onrender.com` (same production API as iOS). To hit a local server instead, set `DEBUG_API_BASE_URL=http://10.0.2.2:3000` in `local.properties` (emulator) or `http://<lan-ip>:3000` on a physical device. Mock/dev sign-in is only enabled for those local URLs.

## Upload keystore (never commit)

```bash
mkdir -p android/keystore
keytool -genkeypair -v \
  -keystore android/keystore/unearth-upload.jks \
  -alias unearth-upload \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storetype JKS
```

Use Play App Signing. Keep the JKS and passwords off git (`android/keystore/` is gitignored).

## SHA-1 / SHA-256 fingerprints

Add **both** of these SHA-1s to the Google Cloud Android OAuth client and the Maps API key restriction:

1. **Upload key** (this machine):

```bash
keytool -list -v -keystore android/keystore/unearth-upload.jks -alias unearth-upload
```

2. **Play App Signing key** — Play Console → your app → Test and release → App integrity → App signing key certificate → SHA-1 and SHA-256.

Debug (for local Google sign-in):

```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

SHA-256 values from the same commands go in Digital Asset Links (below).

## App bundle

```bash
cd android
./gradlew :app:bundleRelease
```

The AAB is at `app/build/outputs/bundle/release/app-release.aab`. Wire signing in `app/build.gradle.kts` (or Android Studio’s signing config) with the upload keystore before this command will produce an uploadable bundle.

## App Links

Intent filter already verifies `https://unearth.vercel.app/g/<slug>`.

Host this file on the website at:

**`https://unearth.vercel.app/.well-known/assetlinks.json`**

Source in this repo: `website/public/.well-known/assetlinks.json`. Replace the `REPLACE_WITH_*_SHA256` placeholders with:

- debug keystore SHA-256
- upload key SHA-256
- Play App Signing SHA-256

Then redeploy the website so `assetlinks.json` is served with `Content-Type: application/json` and no redirect.

## Server (backward-compatible)

Android needs:

- Migration `005_google_auth.sql` (`users.google_sub`, nullable `users.apple_sub`, `gems.google_place_id`)
- `POST /auth/google` `{ idToken }`
- optional `googlePlaceId` on `POST /gems` and `GET /gems/match`
- Render env `GOOGLE_WEB_CLIENT_ID` = the Web OAuth client ID

iOS Sign in with Apple is unchanged. Apple and Google sign-in become the same Unearth user when the verified emails match (Apple Hide My Email is not linked automatically; `POST /me/link/google` covers that case).
