# Unearth

iOS app + Fastify API for sharing hidden gems — little-known places unearthed on a map. Independent finds polish a gem; no photo uploads or star ratings in v1.

## Layout

```
/ios        Xcode project "Unearth" (SwiftUI, MapKit, Sign in with Apple)
/server     Fastify + TypeScript API
/server/db  schema.sql
```

## Prerequisites

- Xcode 16+, iOS 17 SDK
- Node.js 20+
- [xcodegen](https://github.com/yonaskolb/XcodeGen) (`brew install xcodegen`)
- Neon Postgres project with `postgis`, `pg_trgm`, `citext` (schema applied via `server/db/schema.sql`)
- Apple Developer account (Sign in with Apple + Maps)

## Server

```bash
cd server
cp .env.example .env
# Fill DATABASE_URL, JWT_SECRET, TOKEN_ENCRYPTION_KEY, APPLE_* 
npm install
npm run dev
```

Health check: `GET http://localhost:3000/health` → `{ "ok": true }`

**Production:** [https://unearth-1o4a.onrender.com](https://unearth-1o4a.onrender.com) — `GET /health` → `{ "ok": true }`

### Environment (Render)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon pooled connection string (`sslmode=require`) |
| `JWT_SECRET` | HS256 access-token secret |
| `TOKEN_ENCRYPTION_KEY` | Encrypts Apple refresh tokens |
| `APPLE_BUNDLE_ID` | App bundle ID (JWT audience) |
| `APPLE_TEAM_ID` / `APPLE_KEY_ID` / `APPLE_PRIVATE_KEY` | Sign in with Apple client secret |

Deploy with `server/render.yaml` or the included `Dockerfile`.

## iOS

```bash
cd ios
xcodegen generate
open Unearth.xcodeproj
```

1. Set your **Signing Team** on the Unearth target.
2. Enable **Sign in with Apple** capability (entitlements file included).
3. DEBUG builds use `http://localhost:3000` and include a mock sign-in. RELEASE points at `https://unearth-1o4a.onrender.com`.
4. Run on a simulator or device.

Fonts: Bricolage Grotesque + DM Sans (OFL) are bundled under `Unearth/Resources/Fonts/` and registered in `Info.plist`.

## Vocabulary

Gem · Unearth · Dig · Stash · Find · Uncut / Polished / Rare / Mined out · First find · Prospector

## Out of scope (v1)

Photo uploads, star ratings, comments, following, push notifications, Android, web, dark mode.
