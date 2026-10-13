import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { sql } from "../db.js";
import { requireAdmin } from "../middleware/auth.js";
import { revokeAllRefreshTokens } from "../lib/tokens.js";

const idParams = z.object({
  id: z.string().uuid(),
});

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  app.get("/admin/reports", { preHandler: requireAdmin }, async (request) => {
    const limit = Math.min(
      200,
      Math.max(1, Number((request.query as { limit?: string }).limit ?? 50)),
    );
    const rows = await sql`
      select
        r.id,
        r.reason,
        r.created_at,
        r.gem_id,
        r.find_id,
        r.reporter_id,
        reporter.handle as reporter_handle,
        g.name as gem_name,
        f.description as find_description,
        find_author.handle as find_author_handle
      from reports r
      join users reporter on reporter.id = r.reporter_id
      left join gems g on g.id = r.gem_id
      left join finds f on f.id = r.find_id
      left join users find_author on find_author.id = f.user_id
      order by r.created_at desc
      limit ${limit}
    `;

    return {
      reports: rows.map((r) => ({
        id: r.id,
        reason: r.reason,
        createdAt: r.created_at,
        gemId: r.gem_id,
        gemName: r.gem_name,
        findId: r.find_id,
        findDescription: r.find_description,
        findAuthorHandle: r.find_author_handle,
        reporterId: r.reporter_id,
        reporterHandle: r.reporter_handle,
      })),
    };
  });

  app.delete("/admin/finds/:id", { preHandler: requireAdmin }, async (request, reply) => {
    const parsed = idParams.safeParse(request.params);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid find id" });
    }

    const result = await sql.begin(async (tx) => {
      const finds = await tx<{ id: string; gem_id: string; user_id: string }[]>`
        select id, gem_id, user_id from finds where id = ${parsed.data.id} limit 1
      `;
      const find = finds[0];
      if (!find) return { deleted: false as const };

      const gems = await tx<{ first_finder_id: string | null }[]>`
        select first_finder_id from gems where id = ${find.gem_id} for update limit 1
      `;
      const gem = gems[0];
      await tx`delete from finds where id = ${find.id}`;

      const remaining = await tx<{ user_id: string }[]>`
        select user_id from finds where gem_id = ${find.gem_id} order by created_at asc
      `;
      if (remaining.length === 0) {
        await tx`delete from gems where id = ${find.gem_id}`;
        return { deleted: true as const, gemDeleted: true };
      }

      const wasFirst = gem?.first_finder_id === find.user_id;
      await tx`
        update gems
        set
          find_count = ${remaining.length},
          first_finder_id = ${wasFirst ? remaining[0]!.user_id : gem?.first_finder_id ?? null}
        where id = ${find.gem_id}
      `;
      return { deleted: true as const, gemDeleted: false };
    });

    if (!result.deleted) {
      return reply.code(404).send({ error: "Find not found" });
    }
    return result;
  });

  app.delete("/admin/gems/:id", { preHandler: requireAdmin }, async (request, reply) => {
    const parsed = idParams.safeParse(request.params);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid gem id" });
    }
    const deleted = await sql`
      delete from gems where id = ${parsed.data.id} returning id
    `;
    if (!deleted[0]) {
      return reply.code(404).send({ error: "Gem not found" });
    }
    return reply.code(204).send();
  });

  app.post("/admin/users/:id/ban", { preHandler: requireAdmin }, async (request, reply) => {
    const parsed = idParams.safeParse(request.params);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid user id" });
    }
    const updated = await sql`
      update users
      set banned_at = coalesce(banned_at, now())
      where id = ${parsed.data.id}
      returning id, handle, banned_at
    `;
    if (!updated[0]) {
      return reply.code(404).send({ error: "User not found" });
    }
    await revokeAllRefreshTokens(parsed.data.id);
    return {
      id: updated[0].id,
      handle: updated[0].handle,
      bannedAt: updated[0].banned_at,
    };
  });
}
