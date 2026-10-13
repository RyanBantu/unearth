import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { sql } from "../db.js";
import { serializeGemStatus } from "../lib/serialize.js";
import { requireAuth } from "../middleware/auth.js";

const gemIdParams = z.object({
  gemId: z.string().uuid(),
});

export async function stashRoutes(app: FastifyInstance): Promise<void> {
  app.get("/stash", { preHandler: requireAuth }, async (request) => {
    const rows = await sql`
      select
        g.id,
        g.name,
        g.category,
        g.address,
        g.find_count,
        g.upvotes,
        g.downvotes,
        g.apple_place_id,
        g.google_maps_url,
        g.first_finder_id,
        g.created_at,
        st_y(g.location::geometry) as lat,
        st_x(g.location::geometry) as lng,
        s.created_at as stashed_at
      from stash s
      join gems g on g.id = s.gem_id
      where s.user_id = ${request.user.id}
      order by s.created_at desc
    `;

    return {
      gems: rows.map((g) => ({
        id: g.id,
        name: g.name,
        category: g.category,
        address: g.address,
        applePlaceId: g.apple_place_id,
        googleMapsUrl: g.google_maps_url,
        firstFinderId: g.first_finder_id,
        createdAt: g.created_at,
        lat: Number(g.lat),
        lng: Number(g.lng),
        stashedAt: g.stashed_at,
        upvotes: Number(g.upvotes),
        downvotes: Number(g.downvotes),
        status: serializeGemStatus(Number(g.find_count)),
      })),
    };
  });

  app.put("/stash/:gemId", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = gemIdParams.safeParse(request.params);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid gem id" });
    }

    const gems = await sql<{ id: string }[]>`
      select id from gems where id = ${parsed.data.gemId} limit 1
    `;
    if (!gems[0]) {
      return reply.code(404).send({ error: "Gem not found" });
    }

    await sql`
      insert into stash (user_id, gem_id)
      values (${request.user.id}, ${parsed.data.gemId})
      on conflict do nothing
    `;
    return reply.code(204).send();
  });

  app.delete("/stash/:gemId", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = gemIdParams.safeParse(request.params);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid gem id" });
    }

    await sql`
      delete from stash
      where user_id = ${request.user.id} and gem_id = ${parsed.data.gemId}
    `;
    return reply.code(204).send();
  });
}
