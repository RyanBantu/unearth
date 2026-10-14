import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

process.env.NODE_ENV = "development";
process.env.ALLOW_DEV_AUTH = "true";
process.env.GEOCODING_DISABLED = "true";
process.env.GOOGLE_WEB_CLIENT_ID = "test-web-client.apps.googleusercontent.com";

const { setGoogleIdTokenVerifier, GoogleAudienceError } = await import("../src/lib/google.js");
const { buildApp } = await import("../src/app.js");
const { sql } = await import("../src/db.js");

const SUB = "google-test-sub-unearth";
const AUDIENCE = "test-web-client.apps.googleusercontent.com";

describe("POST /auth/google", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  before(async () => {
    app = await buildApp();
    await app.ready();
    await sql`delete from users where google_sub = ${SUB}`;
  });

  after(async () => {
    setGoogleIdTokenVerifier(null);
    await sql`delete from users where google_sub = ${SUB}`;
    await app.close();
    await sql.end({ timeout: 5 });
  });

  test("valid token creates a user", async () => {
    setGoogleIdTokenVerifier(async (idToken, audience) => {
      assert.equal(idToken, "valid-google-token");
      assert.equal(audience, AUDIENCE);
      return {
        sub: SUB,
        email: "prospector@example.com",
        emailVerified: true,
        name: "Ada Prospector",
      };
    });

    const res = await app.inject({
      method: "POST",
      url: "/auth/google",
      payload: { idToken: "valid-google-token" },
    });
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as {
      accessToken: string;
      refreshToken: string;
      user: { email: string; displayName: string; handle: string | null };
      needsHandle: boolean;
    };
    assert.ok(body.accessToken);
    assert.ok(body.refreshToken);
    assert.equal(body.user.email, "prospector@example.com");
    assert.equal(body.user.displayName, "Ada Prospector");
    assert.equal(body.needsHandle, true);
    assert.equal(body.user.handle, null);
  });

  test("same google_sub signs into the same user", async () => {
    setGoogleIdTokenVerifier(async () => ({
      sub: SUB,
      email: "other@example.com",
      emailVerified: true,
      name: "Someone Else",
    }));

    const res = await app.inject({
      method: "POST",
      url: "/auth/google",
      payload: { idToken: "same-sub-token" },
    });
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as { user: { email: string; displayName: string } };
    assert.equal(body.user.email, "prospector@example.com");
    assert.equal(body.user.displayName, "Ada Prospector");
  });

  test("wrong audience is rejected", async () => {
    setGoogleIdTokenVerifier(async () => {
      throw new GoogleAudienceError();
    });

    const res = await app.inject({
      method: "POST",
      url: "/auth/google",
      payload: { idToken: "wrong-aud-token" },
    });
    assert.equal(res.statusCode, 401, res.body);
    assert.match(res.json().error as string, /audience/i);
  });

  test("Apple sign-in still works unchanged", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/dev",
      payload: { handle: "appleunchanged" },
    });
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as { accessToken: string; user: { handle: string } };
    assert.ok(body.accessToken);
    assert.equal(body.user.handle, "appleunchanged");
    await sql`delete from users where handle = ${"appleunchanged"}`;
  });
});
