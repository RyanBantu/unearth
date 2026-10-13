import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { sql } from "../db.js";
import { requireAuth } from "../middleware/auth.js";

const reportBody = z
  .object({
    gemId: z.string().uuid().optional(),
    findId: z.string().uuid().optional(),
    reason: z.string().trim().min(1).max(1000),
  })
  .refine((b) => b.gemId || b.findId, {
    message: "Either gemId or findId is required",
  });

export async function reportsRoutes(app: FastifyInstance): Promise<void> {
  app.post("/reports", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = reportBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid body", details: parsed.error.flatten() });
    }

    let { gemId, findId, reason } = parsed.data;

    if (findId) {
      const finds = await sql<{ id: string; gem_id: string }[]>`
        select id, gem_id from finds where id = ${findId} limit 1
      `;
      if (!finds[0]) return reply.code(404).send({ error: "Find not found" });
      // Ensure gem_id is set so admin tooling can navigate.
      gemId = gemId ?? finds[0].gem_id;
    }
    if (gemId) {
      const gems = await sql<{ id: string }[]>`select id from gems where id = ${gemId} limit 1`;
      if (!gems[0]) return reply.code(404).send({ error: "Gem not found" });
    }

    const rows = await sql`
      insert into reports (reporter_id, gem_id, find_id, reason)
      values (
        ${request.user.id},
        ${gemId ?? null},
        ${findId ?? null},
        ${reason}
      )
      returning id, created_at
    `;

    // Reported content is immediately hidden from this reporter via query filters.
    return reply.code(201).send({
      id: rows[0]!.id,
      createdAt: rows[0]!.created_at,
      hidden: true,
      message: "Thanks — we'll review this within 24 hours.",
    });
  });
}
