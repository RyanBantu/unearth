# Sign in with Apple setup

Bundle ID: **`com.unearth.app`**

## 1. Apple Developer — App ID

1. Open [Certificates, Identifiers & Profiles](https://developer.apple.com/account/resources/identifiers/list)
2. **Identifiers** → select (or create) App ID `com.unearth.app`
3. Enable **Sign In with Apple** → Save

## 2. Apple Developer — Sign in with Apple key

1. **Keys** → **+**
2. Name it e.g. `Unearth SIWA`
3. Enable **Sign in with Apple** → Configure → choose App ID `com.unearth.app`
4. Continue → Register → **Download** the `.p8` file (once only)
5. Note:
   - **Key ID** (10 chars on the key page)
   - **Team ID** (top-right of the Membership page, or Membership details)

Keep the `.p8` out of git (already gitignored via `*.p8`).

## 3. Xcode

```bash
cd ios
xcodegen generate
open Unearth.xcodeproj
```

1. Select the **Unearth** target → **Signing & Capabilities**
2. Choose your **Team**
3. Confirm **Sign in with Apple** capability is present (entitlements file includes it)
4. Run on a **real device** or Simulator signed into an Apple ID (Settings → Apple ID)

## 4. Server / Render env vars

| Variable | Value |
|---|---|
| `APPLE_BUNDLE_ID` | `com.unearth.app` |
| `APPLE_TEAM_ID` | Your 10-character Team ID |
| `APPLE_KEY_ID` | Key ID from step 2 |
| `APPLE_PRIVATE_KEY` | Full PEM contents of the `.p8`, with `\n` for newlines in a single-line env value |

Example `APPLE_PRIVATE_KEY` format on Render:

```
-----BEGIN PRIVATE KEY-----\nMIGTAgEAMBMG...\n...\n-----END PRIVATE KEY-----
```

Or paste the multiline PEM if Render’s UI supports it.

Also ensure:

- `JWT_SECRET` — long random string
- `TOKEN_ENCRYPTION_KEY` — 64 hex chars (32 bytes) for encrypting Apple refresh tokens
- `DATABASE_URL` — Neon pooled URL

Local `.env` (never commit):

```bash
cd server
cp .env.example .env
# fill APPLE_* from your key
```

## 5. Verify

```bash
# After deploy, health should still work:
curl https://unearth-1o4a.onrender.com/health
```

In the app: tap **Sign in with Apple** (not mock). You should land on **Pick a handle** if it’s a new account.

### Common failures

| Symptom | Fix |
|---|---|
| Capability missing / signing error | Team selected + App ID has SIWA enabled |
| `Invalid Apple identity token` | `APPLE_BUNDLE_ID` must be exactly `com.unearth.app` |
| `Apple authorization code exchange failed` | Wrong Key ID / Team ID / private key, or key not linked to this App ID |
| Works once then fails | Normal — Apple only sends name/email the first time; server already stores them |

## 6. Optional: turn off dev auth in production

After SIWA works, set on Render:

```
ALLOW_DEV_AUTH=false
```
