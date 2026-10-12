import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { sql } from "../db.js";
import { HANDLE_REGEX } from "../lib/status.js";
import { requireAuth } from "../middleware/auth.js";

const handleParams = z.object({
  handle: z.string().min(1),
});

export async function handlesRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/handles/:handle/available",
    { preHandler: requireAuth },
    async (request, reply) => {
      const parsed = handleParams.safeParse(request.params);
      if (!parsed.success) {
        return reply.code(400).send({ error: "Invalid handle" });
      }

      const handle = parsed.data.handle.toLowerCase();
      if (!HANDLE_REGEX.test(handle)) {
        return { available: false };
      }

      const rows = await sql<{ id: string }[]>`
        select id from users where handle = ${handle} limit 1
      `;
      return { available: rows.length === 0 };
    },
  );
}
