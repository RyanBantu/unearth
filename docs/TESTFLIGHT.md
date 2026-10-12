# TestFlight open testing (Unearth)

## What’s ready locally

- Release **archive** + **App Store IPA** built for `com.ryanbantu.unearth` (version **1.0**, build **2**)
- Archive: `ios/build/Unearth.xcarchive`
- IPA: `ios/build/export/Unearth.ipa`
- Export compliance: `ITSAppUsesNonExemptEncryption = false` in Info.plist

Upload failed because **there is no App Store Connect app record** for `com.ryanbantu.unearth` yet.

## 1. Create the app (one-time)

1. Open [App Store Connect → My Apps](https://appstoreconnect.apple.com/apps) and sign in with **bantu.ryan@gmail.com** (team `8XCCGLJ4KA`).
2. Click **+** → **New App**.
3. Fill in:
   - Platforms: **iOS**
   - Name: **Unearth**
   - Primary language: English (or your preference)
   - Bundle ID: **com.ryanbantu.unearth** (must already exist under Identifiers)
   - SKU: e.g. `unearth-ios`
   - User Access: Full Access
4. Save.

Also add **Privacy Policy URL** in App Information when prompted:  
`https://github.com/RyanBantu/unearth/blob/main/docs/PRIVACY.md`

## 2. Upload the build

After the app exists, say **“upload again”** (or re-run export/upload). We’ll use Xcode’s signed-in session:

```bash
cd ios
xcodebuild -exportArchive \
  -archivePath build/Unearth.xcarchive \
  -exportOptionsPlist ExportOptions.plist \
  -exportPath build/export \
  -allowProvisioningUpdates
```

(`ExportOptions.plist` uses `destination: upload`.)

Processing in App Store Connect usually takes a few minutes.

## 3. Enable open testing (public link)

1. App Store Connect → **Unearth** → **TestFlight**.
2. Fill **Test Information** (Beta App Description, contact email, etc.) if prompted.
3. Create an **External** group (e.g. “Open Testing”).
4. **Add** the processed build → **Submit for Review** (first external build needs Beta App Review).
5. When approved: enable **Public Link** on that group and share it.

Anyone with the link can join in the TestFlight app (up to your tester limit).
