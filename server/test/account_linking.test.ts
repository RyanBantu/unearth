import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { config } from "dotenv";
import { randomBytes } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { UserRow } from "../src/db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

process.env.NODE_ENV = "development";
process.env.ALLOW_DEV_AUTH = "true";
process.env.GEOCODING_DISABLED = "true";
process.env.GOOGLE_WEB_CLIENT_ID = "test-web-client.apps.googleusercontent.com";

const { setGoogleIdTokenVerifier } = await import("../src/lib/google.js");
const { isLinkableEmail, linkGoogleIdentity, pickPrimary, upsertAppleUser, upsertGoogleUser } =
  await import("../src/lib/accountLinking.js");
const { issueTokenPair } = await import("../src/lib/tokens.js");
const { buildApp } = await import("../src/app.js");
const { sql } = await import("../src/db.js");

const stamp = `${Date.now().toString(36)}${randomBytes(2).toString("hex")}`;
const EMAIL = `link.${stamp}@example.com`;
const RELAY = `hide.${stamp}@privaterelay.appleid.com`;
const GOOGLE_SUB = `link-google-${stamp}`;
const APPLE_SUB = `link-apple-${stamp}`;
const HANDLE = `lk${stamp}`.slice(0, 20);
const SLUG = `link-test-${stamp}`;

function user(partial: Partial<UserRow> & Pick<UserRow, "id">): UserRow {
  return {
    apple_sub: null,
    google_sub: null,
    email: null,
    display_name: null,
    handle: null,
    apple_refresh_token_enc: null,
    created_at: new Date("2024-01-01T00:00:00Z"),
    agreed_terms_at: null,
    banned_at: null,
    ...partial,
  };
}

describe("account linking helpers", () => {
  test("Hide My Email is not linkable", () => {
    assert.equal(isLinkableEmail("ada@example.com"), true);
    assert.equal(isLinkableEmail("  ada@example.com  "), true);
    assert.equal(isLinkableEmail(null), false);
    assert.equal(isLinkableEmail("abc@privaterelay.appleid.com"), false);
  });

  test("pickPrimary keeps the Apple account", () => {
    const apple = user({
      id: "a",
      apple_sub: "apple",
      handle: "ioshandle",
      created_at: new Date("2025-01-01"),
    });
    const google = user({
      id: "g",
      google_sub: "google",
      handle: "androidhandle",
      created_at: new Date("2024-01-01"),
    });
    const { primary, secondary } = pickPrimary(google, apple);
    assert.equal(primary.id, "a");
    assert.equal(secondary.id, "g");
  });
});

describe("Apple ↔ Google account linking", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  async function cleanup() {
    await sql`delete from gems where slug = ${SLUG}`;
    await sql`delete from users where google_sub = ${GOOGLE_SUB}`;
    await sql`delete from users where apple_sub = ${APPLE_SUB}`;
    await sql`delete from users where handle = ${HANDLE}`;
    await sql`delete from users where email in (${EMAIL}, ${RELAY})`;
  }

  before(async () => {
    app = await buildApp();
    await app.ready();
    await cleanup();
  });

  after(async () => {
    setGoogleIdTokenVerifier(null);
    await cleanup();
    await app.close();
    await sql.end({ timeout: 5 });
  });

  test("Google sign-in attaches to an existing Apple user with the same email", async () => {
    const apple = await upsertAppleUser({
      identity: { sub: APPLE_SUB, email: EMAIL },
      displayName: "Ada Apple",
      clientId: null,
    });
    await sql`update users set handle = ${HANDLE} where id = ${apple.id}`;

    setGoogleIdTokenVerifier(async () => ({
      sub: GOOGLE_SUB,
      email: EMAIL,
      emailVerified: true,
      name: "Ada Google",
    }));

    const res = await app.inject({
      method: "POST",
      url: "/auth/google",
      payload: { idToken: "link-token" },
    });
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as { user: { id: string; handle: string; email: string } };
    assert.equal(body.user.id, apple.id);
    assert.equal(body.user.handle, HANDLE);
    assert.equal(body.user.email, EMAIL);

    const rows = await sql<UserRow[]>`
      select id, apple_sub, google_sub, handle from users where id = ${apple.id} limit 1
    `;
    assert.equal(rows[0]?.apple_sub, APPLE_SUB);
    assert.equal(rows[0]?.google_sub, GOOGLE_SUB);
    assert.equal(rows[0]?.handle, HANDLE);
  });

  test("Apple Hide My Email does not auto-link to Google", async () => {
    await cleanup();
    await upsertAppleUser({
      identity: { sub: APPLE_SUB, email: RELAY },
      displayName: "Hidden",
      clientId: null,
    });

    setGoogleIdTokenVerifier(async () => ({
      sub: GOOGLE_SUB,
      email: EMAIL,
      emailVerified: true,
      name: "Ada Google",
    }));

    const res = await app.inject({
      method: "POST",
      url: "/auth/google",
      payload: { idToken: "relay-token" },
    });
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as { user: { id: string } };

    const appleRows = await sql<{ id: string }[]>`
      select id from users where apple_sub = ${APPLE_SUB} limit 1
    `;
    const googleRows = await sql<{ id: string }[]>`
      select id from users where google_sub = ${GOOGLE_SUB} limit 1
    `;
    assert.ok(appleRows[0]);
    assert.ok(googleRows[0]);
    assert.notEqual(appleRows[0]!.id, googleRows[0]!.id);
    assert.equal(body.user.id, googleRows[0]!.id);
  });

  test("Apple sign-in attaches to an existing Google user with the same email", async () => {
    await cleanup();
    const google = await upsertGoogleUser({
      sub: GOOGLE_SUB,
      email: EMAIL,
      emailVerified: true,
      name: "Ada Google",
    });
    const apple = await upsertAppleUser({
      identity: { sub: APPLE_SUB, email: EMAIL },
      displayName: "Ada Apple",
      clientId: null,
    });
    assert.equal(apple.id, google.id);
    assert.equal(apple.apple_sub, APPLE_SUB);
    assert.equal(apple.google_sub, GOOGLE_SUB);
  });

  test("pre-existing Apple and Google users with the same email are merged", async () => {
    await cleanup();
    const apple = await upsertAppleUser({
      identity: { sub: APPLE_SUB, email: EMAIL },
      displayName: "Ada Apple",
      clientId: null,
    });
    await sql`update users set handle = ${HANDLE}, agreed_terms_at = now() where id = ${apple.id}`;

    const googleRows = await sql<UserRow[]>`
      insert into users (google_sub, email, display_name)
      values (${GOOGLE_SUB}, ${EMAIL}, ${"Ada Google"})
      returning id, apple_sub, google_sub, email, display_name, handle,
                apple_refresh_token_enc, created_at, agreed_terms_at, banned_at
    `;
    const google = googleRows[0]!;
    assert.notEqual(google.id, apple.id);

    await sql`
      insert into gems (name, category, location, slug, first_finder_id, find_count)
      values (
        ${"Link Test Cafe"},
        ${"cafe"},
        ST_SetSRID(ST_MakePoint(74.786, 13.351), 4326)::geography,
        ${SLUG},
        ${google.id},
        1
      )
    `;
    const gems = await sql<{ id: string }[]>`select id from gems where slug = ${SLUG} limit 1`;
    const gemId = gems[0]!.id;
    await sql`
      insert into finds (gem_id, user_id, description)
      values (${gemId}, ${google.id}, ${"Found it on Android."})
    `;
    await sql`insert into stash (user_id, gem_id) values (${google.id}, ${gemId})`;

    setGoogleIdTokenVerifier(async () => ({
      sub: GOOGLE_SUB,
      email: EMAIL,
      emailVerified: true,
      name: "Ada Google",
    }));

    const res = await app.inject({
      method: "POST",
      url: "/auth/google",
      payload: { idToken: "merge-token" },
    });
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as { user: { id: string; handle: string } };
    assert.equal(body.user.id, apple.id);
    assert.equal(body.user.handle, HANDLE);

    const leftover = await sql<{ id: string }[]>`select id from users where id = ${google.id}`;
    assert.equal(leftover.length, 0);

    const finds = await sql<{ user_id: string }[]>`
      select user_id from finds where gem_id = ${gemId}
    `;
    assert.equal(finds.length, 1);
    assert.equal(finds[0]?.user_id, apple.id);

    const stash = await sql<{ user_id: string }[]>`
      select user_id from stash where gem_id = ${gemId}
    `;
    assert.equal(stash.length, 1);
    assert.equal(stash[0]?.user_id, apple.id);

    const gem = await sql<{ first_finder_id: string; find_count: number }[]>`
      select first_finder_id, find_count from gems where id = ${gemId} limit 1
    `;
    assert.equal(gem[0]?.first_finder_id, apple.id);
    assert.equal(Number(gem[0]?.find_count), 1);

    const linked = await sql<{ google_sub: string | null; apple_sub: string | null }[]>`
      select apple_sub, google_sub from users where id = ${apple.id} limit 1
    `;
    assert.equal(linked[0]?.apple_sub, APPLE_SUB);
    assert.equal(linked[0]?.google_sub, GOOGLE_SUB);
  });

  test("POST /me/link/google attaches Google when emails do not match", async () => {
    await cleanup();
    const apple = await upsertAppleUser({
      identity: { sub: APPLE_SUB, email: RELAY },
      displayName: "Hidden",
      clientId: null,
    });
    await sql`update users set handle = ${HANDLE} where id = ${apple.id}`;

    setGoogleIdTokenVerifier(async () => ({
      sub: GOOGLE_SUB,
      email: EMAIL,
      emailVerified: true,
      name: "Ada Google",
    }));

    const tokens = await issueTokenPair(apple.id);
    const res = await app.inject({
      method: "POST",
      url: "/me/link/google",
      headers: { authorization: `Bearer ${tokens.accessToken}` },
      payload: { idToken: "explicit-link" },
    });
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as { id: string; handle: string };
    assert.equal(body.id, apple.id);
    assert.equal(body.handle, HANDLE);

    const rows = await sql<{ apple_sub: string | null; google_sub: string | null }[]>`
      select apple_sub, google_sub from users where id = ${apple.id} limit 1
    `;
    assert.equal(rows[0]?.apple_sub, APPLE_SUB);
    assert.equal(rows[0]?.google_sub, GOOGLE_SUB);

    const viaHelper = await linkGoogleIdentity(apple, {
      sub: GOOGLE_SUB,
      email: EMAIL,
      emailVerified: true,
      name: "Ada Google",
    });
    assert.equal(viaHelper.id, apple.id);
    assert.equal(viaHelper.google_sub, GOOGLE_SUB);
  });
});
