import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const { buildApp } = await import("../src/app.js");
const { sql } = await import("../src/db.js");

describe("JSON content-type parsing", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  before(async () => {
    app = await buildApp();
    await app.ready();
  });

  after(async () => {
    await app.close();
    await sql.end({ timeout: 5 });
  });

  test("bodyless DELETE with application/json reaches the route", async () => {
    const res = await app.inject({
      method: "DELETE",
      url: "/finds/00000000-0000-4000-8000-000000000000",
      headers: { "content-type": "application/json" },
    });
    assert.equal(res.statusCode, 401, res.body);
  });

  test("malformed JSON is still rejected with 400", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      headers: { "content-type": "application/json" },
      payload: "{not json",
    });
    assert.equal(res.statusCode, 400, res.body);
  });
});
