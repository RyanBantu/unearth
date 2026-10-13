import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

process.env.NODE_ENV = "development";
process.env.ALLOW_DEV_AUTH = "true";
process.env.WEB_SIGN_IN_ENABLED = "true";
process.env.GEOCODING_DISABLED = "true";

const { buildApp } = await import("../src/app.js");
const { sql } = await import("../src/db.js");

type App = Awaited<ReturnType<typeof buildApp>>;

function sessionCookie(res: { headers: Record<string, unknown> }): string {
  const raw = res.headers["set-cookie"];
  const header = Array.isArray(raw) ? raw.join("; ") : String(raw ?? "");
  const match = header.match(/unearth_session=([^;]+)/);
  assert.ok(match, `no session cookie in: ${header}`);
  assert.match(header, /HttpOnly/i);
  assert.match(header, /SameSite=Lax/i);
  return `unearth_session=${match[1]}`;
}

async function webSignIn(app: App, handle: string): Promise<string> {
  const res = await app.inject({ method: "POST", url: "/auth/dev", payload: { handle, web: true } });
  assert.equal(res.statusCode, 200, res.body);
  assert.equal((res.json() as { accessToken?: string }).accessToken, undefined);
  const cookie = sessionCookie(res);
  const terms = await app.inject({
    method: "POST",
    url: "/me/agree-terms",
    headers: { cookie, "x-unearth-web": "1" },
  });
  assert.equal(terms.statusCode, 200, terms.body);
  return cookie;
}

describe("web sessions and public reads", () => {
  let app: App;
  const handle = `webtest_${Date.now().toString(36)}`.slice(0, 20);
  const city = `Testville ${handle}`;
  const citySlug = `testville-${handle}`.replace(/_/g, "-");

  before(async () => {
    app = await buildApp();
    await app.ready();
  });

  after(async () => {
    await sql`delete from users where apple_sub = ${`dev:${handle}`}`;
    await app.close();
    await sql.end({ timeout: 5 });
  });

  test("nearby still requires a token (iPhone app)", async () => {
    const res = await app.inject({ method: "GET", url: "/gems/nearby?lat=13.35&lng=74.79&radius_m=50000" });
    assert.equal(res.statusCode, 401, res.body);
  });

  test("a bad bearer token on a public route still returns 401 so iOS refreshes", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/users/nobody-here",
      headers: { authorization: "Bearer nope" },
    });
    assert.equal(res.statusCode, 401, res.body);
  });

  test("a stale cookie on a public route is cleared and the request continues signed out", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/gems/does-not-exist-0000",
      headers: { cookie: "unearth_session=stale" },
    });
    assert.equal(res.statusCode, 404, res.body);
    assert.match(String(res.headers["set-cookie"] ?? ""), /unearth_session=;/);
  });

  test("cookie session: create a gem, fetch it by slug, search, stash, sign out", async () => {
    const cookie = await webSignIn(app, handle);

    const me = await app.inject({ method: "GET", url: "/me", headers: { cookie } });
    assert.equal(me.statusCode, 200, me.body);
    assert.equal((me.json() as { handle: string }).handle, handle);

    const created = await app.inject({
      method: "POST",
      url: "/gems",
      headers: { cookie, "x-unearth-web": "1" },
      payload: {
        name: `Zz Web Test Stall ${handle}`,
        category: "food",
        lat: -54.8,
        lng: -68.3,
        description: "Created by the web session test.",
        confirmedNew: true,
        city,
        area: "Harbour",
        country: "Argentina",
      },
    });
    assert.equal(created.statusCode, 201, created.body);
    const gem = created.json() as { id: string; slug: string };
    assert.match(gem.slug, /^zz-web-test-stall-webtest-[a-z0-9-]+$/);
    assert.match(gem.slug, /-[a-z0-9]{4}$/);

    const bySlug = await app.inject({ method: "GET", url: `/gems/${gem.slug}` });
    assert.equal(bySlug.statusCode, 200, bySlug.body);
    const publicView = bySlug.json() as {
      id: string;
      city: string;
      area: string;
      citySlug: string;
      firstFinderHandle: string;
      displayName?: string;
      finds: { displayName: string | null; handle: string }[];
    };
    assert.equal(publicView.id, gem.id);
    assert.equal(publicView.city, city);
    assert.equal(publicView.area, "Harbour");
    assert.equal(publicView.citySlug, citySlug);
    assert.equal(publicView.firstFinderHandle, handle);
    assert.equal(publicView.finds[0]?.displayName, null);

    const byId = await app.inject({ method: "GET", url: `/gems/${gem.id}`, headers: { cookie } });
    assert.equal(byId.statusCode, 200, byId.body);
    assert.notEqual((byId.json() as { myFindId: string | null }).myFindId, null);
    assert.equal((byId.json() as { finds: { displayName: string | null }[] }).finds[0]?.displayName, "Dev User");

    const search = await app.inject({
      method: "GET",
      url: `/search?q=${encodeURIComponent("web test stall")}`,
    });
    assert.equal(search.statusCode, 200, search.body);
    assert.ok((search.json() as { gems: { id: string }[] }).gems.some((g) => g.id === gem.id));

    const placeSearch = await app.inject({
      method: "GET",
      url: `/search?q=${encodeURIComponent("Testville")}`,
    });
    assert.equal(placeSearch.statusCode, 200, placeSearch.body);
    assert.ok(
      (placeSearch.json() as { places: { citySlug: string }[] }).places.some((p) => p.citySlug === citySlug),
    );

    const places = await app.inject({ method: "GET", url: "/places" });
    assert.equal(places.statusCode, 200, places.body);
    assert.ok(
      (places.json() as { places: { citySlug: string }[] }).places.some((p) => p.citySlug === citySlug),
    );

    const cityPage = await app.inject({ method: "GET", url: `/places/${citySlug}?sort=new` });
    assert.equal(cityPage.statusCode, 200, cityPage.body);
    assert.ok((cityPage.json() as { gems: { id: string }[] }).gems.some((g) => g.id === gem.id));

    const profile = await app.inject({ method: "GET", url: `/users/${handle}` });
    assert.equal(profile.statusCode, 200, profile.body);
    const body = profile.json() as { user: { handle: string; displayName: string | null; level: string }; finds: unknown[] };
    assert.equal(body.user.handle, handle);
    assert.equal(body.user.displayName, null);
    assert.equal(body.user.level, "Digger");
    assert.equal(body.finds.length, 1);

    const sitemap = await app.inject({ method: "GET", url: "/sitemap-data" });
    assert.equal(sitemap.statusCode, 200, sitemap.body);
    assert.ok((sitemap.json() as { gems: { slug: string }[] }).gems.some((g) => g.slug === gem.slug));

    const noCsrf = await app.inject({ method: "PUT", url: `/stash/${gem.id}`, headers: { cookie } });
    assert.equal(noCsrf.statusCode, 403, noCsrf.body);

    const stashed = await app.inject({
      method: "PUT",
      url: `/stash/${gem.id}`,
      headers: { cookie, "x-unearth-web": "1" },
    });
    assert.equal(stashed.statusCode, 204, stashed.body);

    const logout = await app.inject({ method: "POST", url: "/auth/web/logout", headers: { cookie } });
    assert.equal(logout.statusCode, 204, logout.body);
    const after = await app.inject({ method: "GET", url: "/me", headers: { cookie } });
    assert.equal(after.statusCode, 401, after.body);
  });

  test("unknown slug is 404", async () => {
    const res = await app.inject({ method: "GET", url: "/gems/does-not-exist-0000" });
    assert.equal(res.statusCode, 404, res.body);
  });
});
