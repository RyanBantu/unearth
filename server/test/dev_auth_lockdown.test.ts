import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

// Prove the NODE_ENV gate is what matters, even if someone leaves ALLOW_DEV_AUTH on.
process.env.NODE_ENV = "production";
process.env.ALLOW_DEV_AUTH = "true";
delete process.env.WEB_SIGN_IN_ENABLED;

const { buildApp } = await import("../src/app.js");

describe("dev login and web auth are off in production", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  before(async () => {
    app = await buildApp();
    await app.ready();
  });

  after(async () => {
    await app.close();
  });

  test("POST /auth/dev returns 404 when NODE_ENV=production", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/dev",
      payload: { handle: "shouldfail" },
    });
    assert.equal(res.statusCode, 404, res.body);
  });

  test("POST /auth/web/apple returns 404 when WEB_SIGN_IN_ENABLED is off", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/web/apple",
      payload: {
        idToken: "x",
        code: "x",
        redirectUri: "https://example.com/callback",
      },
    });
    assert.equal(res.statusCode, 404, res.body);
  });
});
