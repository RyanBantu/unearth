import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { config } from "dotenv";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

process.env.ALLOW_DEV_AUTH = "true";

const { buildApp } = await import("../src/app.js");
const { sql } = await import("../src/db.js");

type AuthResponse = {
  accessToken: string;
  user: { id: string; handle: string | null };
};

type VoteResponse = {
  upvotes: number;
  downvotes: number;
  myVote: 1 | -1 | null;
};

type CreateGemResponse = {
  id: string;
  myFindId: string;
};

type CreateFindResponse = {
  find: { id: string };
};

type DeleteFindResponse = {
  gemDeleted: boolean;
};

async function authAs(app: Awaited<ReturnType<typeof buildApp>>, handle: string) {
  const res = await app.inject({
    method: "POST",
    url: "/auth/dev",
    payload: { handle },
  });
  assert.equal(res.statusCode, 200, res.body);
  return res.json() as AuthResponse;
}

async function createGem(
  app: Awaited<ReturnType<typeof buildApp>>,
  token: string,
  name: string,
  lat = 12.97,
  lng = 77.59,
) {
  const res = await app.inject({
    method: "POST",
    url: "/gems",
    headers: { authorization: `Bearer ${token}` },
    payload: {
      name,
      category: "cafe",
      lat,
      lng,
      description: "A quiet spot worth writing about carefully.",
      tags: ["Quiet"],
      confirmedNew: true,
    },
  });
  assert.equal(res.statusCode, 201, res.body);
  return res.json() as CreateGemResponse;
}

async function addFind(
  app: Awaited<ReturnType<typeof buildApp>>,
  token: string,
  gemId: string,
) {
  const res = await app.inject({
    method: "POST",
    url: `/gems/${gemId}/finds`,
    headers: { authorization: `Bearer ${token}` },
    payload: {
      description: "Found it again and still loving the place.",
      tags: ["Quiet"],
    },
  });
  assert.equal(res.statusCode, 201, res.body);
  return res.json() as CreateFindResponse;
}

describe("votes and delete find", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  const createdGemIds: string[] = [];
  const testHandles = [
    `vtownera_${Date.now().toString(36)}`.slice(0, 20),
    `vtvoterb_${Date.now().toString(36)}`.slice(0, 20),
    `vtfinderc_${Date.now().toString(36)}`.slice(0, 20),
  ];

  before(async () => {
    app = await buildApp();
    await app.ready();
  });

  after(async () => {
    for (const id of createdGemIds) {
      await sql`delete from gems where id = ${id}`;
    }
    for (const handle of testHandles) {
      await sql`delete from users where handle = ${handle}`;
    }
    await app.close();
    await sql.end({ timeout: 5 });
  });

  test("voting on my own gem returns 403", async () => {
    const owner = await authAs(app, testHandles[0]!);
    const gem = await createGem(app, owner.accessToken, `Own Vote Gem ${Date.now()}`);
    createdGemIds.push(gem.id);

    const res = await app.inject({
      method: "PUT",
      url: `/gems/${gem.id}/vote`,
      headers: { authorization: `Bearer ${owner.accessToken}` },
      payload: { value: 1 },
    });
    assert.equal(res.statusCode, 403);
  });

  test("switching and removing votes keeps counts correct", async () => {
    const owner = await authAs(app, testHandles[0]!);
    const voter = await authAs(app, testHandles[1]!);
    const gem = await createGem(
      app,
      owner.accessToken,
      `Vote Switch Gem ${Date.now()}`,
      12.971,
      77.591,
    );
    createdGemIds.push(gem.id);

    const up = await app.inject({
      method: "PUT",
      url: `/gems/${gem.id}/vote`,
      headers: { authorization: `Bearer ${voter.accessToken}` },
      payload: { value: 1 },
    });
    assert.equal(up.statusCode, 200, up.body);
    let body = up.json() as VoteResponse;
    assert.deepEqual(body, { upvotes: 1, downvotes: 0, myVote: 1 });

    const down = await app.inject({
      method: "PUT",
      url: `/gems/${gem.id}/vote`,
      headers: { authorization: `Bearer ${voter.accessToken}` },
      payload: { value: -1 },
    });
    assert.equal(down.statusCode, 200, down.body);
    body = down.json() as VoteResponse;
    assert.deepEqual(body, { upvotes: 0, downvotes: 1, myVote: -1 });

    const clear = await app.inject({
      method: "DELETE",
      url: `/gems/${gem.id}/vote`,
      headers: { authorization: `Bearer ${voter.accessToken}` },
    });
    assert.equal(clear.statusCode, 200, clear.body);
    body = clear.json() as VoteResponse;
    assert.deepEqual(body, { upvotes: 0, downvotes: 0, myVote: null });
  });

  test("deleting the only find deletes the gem", async () => {
    const owner = await authAs(app, testHandles[0]!);
    const gem = await createGem(
      app,
      owner.accessToken,
      `Solo Delete Gem ${Date.now()}`,
      12.972,
      77.592,
    );

    const del = await app.inject({
      method: "DELETE",
      url: `/finds/${gem.myFindId}`,
      headers: { authorization: `Bearer ${owner.accessToken}` },
    });
    assert.equal(del.statusCode, 200, del.body);
    const body = del.json() as DeleteFindResponse;
    assert.equal(body.gemDeleted, true);

    const gone = await sql<{ id: string }[]>`
      select id from gems where id = ${gem.id} limit 1
    `;
    assert.equal(gone.length, 0);
  });

  test("deleting the first finder's find passes First find to the next earliest finder", async () => {
    const owner = await authAs(app, testHandles[0]!);
    const second = await authAs(app, testHandles[2]!);
    const gem = await createGem(
      app,
      owner.accessToken,
      `First Pass Gem ${Date.now()}`,
      12.973,
      77.593,
    );
    createdGemIds.push(gem.id);

    const secondFind = await addFind(app, second.accessToken, gem.id);

    const del = await app.inject({
      method: "DELETE",
      url: `/finds/${gem.myFindId}`,
      headers: { authorization: `Bearer ${owner.accessToken}` },
    });
    assert.equal(del.statusCode, 200, del.body);
    const body = del.json() as DeleteFindResponse;
    assert.equal(body.gemDeleted, false);

    const rows = await sql<{ first_finder_id: string; find_count: number }[]>`
      select first_finder_id, find_count from gems where id = ${gem.id} limit 1
    `;
    assert.equal(rows[0]?.first_finder_id, second.user.id);
    assert.equal(Number(rows[0]?.find_count), 1);

    // Clean second find so after() can delete gem via cascade if needed
    await app.inject({
      method: "DELETE",
      url: `/finds/${secondFind.find.id}`,
      headers: { authorization: `Bearer ${second.accessToken}` },
    });
    // gem deleted by that call
    const idx = createdGemIds.indexOf(gem.id);
    if (idx >= 0) createdGemIds.splice(idx, 1);
  });

  test("deleting someone else's find returns 403", async () => {
    const owner = await authAs(app, testHandles[0]!);
    const other = await authAs(app, testHandles[1]!);
    const gem = await createGem(
      app,
      owner.accessToken,
      `Forbidden Delete Gem ${Date.now()}`,
      12.974,
      77.594,
    );
    createdGemIds.push(gem.id);

    const del = await app.inject({
      method: "DELETE",
      url: `/finds/${gem.myFindId}`,
      headers: { authorization: `Bearer ${other.accessToken}` },
    });
    assert.equal(del.statusCode, 403);
  });
});
