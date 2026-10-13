import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { sql } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const userIdParams = z.object({
  id: z.string().uuid(),
});

export async function blocksRoutes(app: FastifyInstance): Promise<void> {
  app.post("/users/:id/block", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = userIdParams.safeParse(request.params);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid user id" });
    }
    const blockedId = parsed.data.id;
    if (blockedId === request.user.id) {
      return reply.code(400).send({ error: "You can't block yourself" });
    }

    const target = await sql<{ id: string; handle: string | null }[]>`
      select id, handle from users where id = ${blockedId} limit 1
    `;
    if (!target[0]) {
      return reply.code(404).send({ error: "User not found" });
    }

    await sql`
      insert into blocks (blocker_id, blocked_id)
      values (${request.user.id}, ${blockedId})
      on conflict do nothing
    `;

    return reply.code(204).send();
  });

  app.delete("/users/:id/block", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = userIdParams.safeParse(request.params);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid user id" });
    }

    await sql`
      delete from blocks
      where blocker_id = ${request.user.id} and blocked_id = ${parsed.data.id}
    `;
    return reply.code(204).send();
  });

  app.get("/me/blocks", { preHandler: requireAuth }, async (request) => {
    const rows = await sql`
      select
        u.id,
        u.handle,
        u.display_name,
        b.created_at
      from blocks b
      join users u on u.id = b.blocked_id
      where b.blocker_id = ${request.user.id}
      order by b.created_at desc
    `;

    return {
      blocks: rows.map((r) => ({
        id: r.id,
        handle: r.handle,
        displayName: r.display_name,
        blockedAt: r.created_at,
      })),
    };
  });
}
