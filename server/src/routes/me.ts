import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { sql, type UserRow } from "../db.js";
import { HANDLE_REGEX } from "../lib/status.js";
import { serializeUser } from "../lib/serialize.js";
import { requireAuth } from "../middleware/auth.js";
import { revokeAppleForUser } from "./auth.js";

const handleBody = z.object({
  handle: z
    .string()
    .regex(HANDLE_REGEX, "Handle must be 3–20 lowercase letters, numbers, or underscore"),
});

async function userStats(userId: string) {
  const [finds, firstFinds] = await Promise.all([
    sql<{ count: string }[]>`
      select count(*)::text as count from finds where user_id = ${userId}
    `,
    sql<{ count: string }[]>`
      select count(*)::text as count from gems where first_finder_id = ${userId}
    `,
  ]);
  const findCount = Number(finds[0]?.count ?? 0);
  return {
    gemsUnearthed: findCount,
    firstFinds: Number(firstFinds[0]?.count ?? 0),
    findCount,
  };
}

export async function meRoutes(app: FastifyInstance): Promise<void> {
  app.get("/me", { preHandler: requireAuth }, async (request) => {
    const userId = request.user.id;
    const [stats, finds] = await Promise.all([
      userStats(userId),
      sql`
        select
          f.id, f.gem_id, f.user_id, f.description, f.liked, f.disliked,
          f.tags, f.created_at,
          g.name as gem_name,
          g.find_count as gem_find_count,
          (g.first_finder_id = ${userId}) as is_first_find
        from finds f
        join gems g on g.id = f.gem_id
        where f.user_id = ${userId}
        order by f.created_at desc
      `,
    ]);

    return {
      ...serializeUser(request.user, stats),
      finds: finds.map((f) => ({
        id: f.id,
        gemId: f.gem_id,
        gemName: f.gem_name,
        userId: f.user_id,
        handle: request.user.handle,
        description: f.description,
        liked: f.liked,
        disliked: f.disliked,
        tags: f.tags,
        createdAt: f.created_at,
        isFirstFind: Boolean(f.is_first_find),
        gemFindCount: Number(f.gem_find_count),
      })),
    };
  });

  app.post("/me/agree-terms", { preHandler: requireAuth }, async (request) => {
    const updated = await sql<UserRow[]>`
      update users
      set agreed_terms_at = coalesce(agreed_terms_at, now())
      where id = ${request.user.id}
      returning id, apple_sub, email, display_name, handle,
                apple_refresh_token_enc, created_at, agreed_terms_at, banned_at
    `;
    const user = updated[0]!;
    const stats = await userStats(user.id);
    return serializeUser(user, stats);
  });

  app.put("/me/handle", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = handleBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid body", details: parsed.error.flatten() });
    }

    const handle = parsed.data.handle.toLowerCase();

    const taken = await sql<{ id: string }[]>`
      select id from users where handle = ${handle} and id <> ${request.user.id} limit 1
    `;
    if (taken.length > 0) {
      return reply.code(409).send({ error: "Handle already taken" });
    }

    const updated = await sql<UserRow[]>`
      update users
      set handle = ${handle}
      where id = ${request.user.id}
      returning id, apple_sub, email, display_name, handle,
                apple_refresh_token_enc, created_at, agreed_terms_at, banned_at
    `;
    const user = updated[0]!;
    const stats = await userStats(user.id);
    return serializeUser(user, stats);
  });

  app.delete("/me", { preHandler: requireAuth }, async (request, reply) => {
    await revokeAppleForUser(request.user);
    await sql`delete from users where id = ${request.user.id}`;
    return reply.code(204).send();
  });
}
