import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { sql } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const findIdParams = z.object({
  id: z.string().uuid(),
});

export async function findsRoutes(app: FastifyInstance): Promise<void> {
  app.delete("/finds/:id", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = findIdParams.safeParse(request.params);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid find id" });
    }

    try {
      const result = await sql.begin(async (tx) => {
        const finds = await tx<{
          id: string;
          gem_id: string;
          user_id: string;
        }[]>`
          select id, gem_id, user_id
          from finds
          where id = ${parsed.data.id}
          for update
          limit 1
        `;
        const find = finds[0];
        if (!find) throw new Error("FIND_NOT_FOUND");
        if (find.user_id !== request.user.id) throw new Error("FIND_FORBIDDEN");

        const gems = await tx<{
          id: string;
          first_finder_id: string | null;
          find_count: number;
        }[]>`
          select id, first_finder_id, find_count
          from gems
          where id = ${find.gem_id}
          for update
          limit 1
        `;
        const gem = gems[0];
        if (!gem) throw new Error("FIND_NOT_FOUND");

        const wasFirstFinder = gem.first_finder_id === find.user_id;

        await tx`delete from finds where id = ${find.id}`;

        const remaining = await tx<{
          user_id: string;
          created_at: string;
        }[]>`
          select user_id, created_at
          from finds
          where gem_id = ${gem.id}
          order by created_at asc
        `;

        if (remaining.length === 0) {
          await tx`delete from gems where id = ${gem.id}`;
          return { gemDeleted: true as const };
        }

        const nextCount = remaining.length;
        const nextFirst =
          wasFirstFinder ? remaining[0]!.user_id : gem.first_finder_id;

        await tx`
          update gems
          set
            find_count = ${nextCount},
            first_finder_id = ${nextFirst}
          where id = ${gem.id}
        `;

        return { gemDeleted: false as const };
      });

      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message === "FIND_NOT_FOUND") {
        return reply.code(404).send({ error: "Find not found" });
      }
      if (message === "FIND_FORBIDDEN") {
        return reply.code(403).send({ error: "You can only delete your own find" });
      }
      throw err;
    }
  });
}
