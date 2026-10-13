import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { sql, type UserRow } from "../db.js";
import { isBlocked } from "../lib/blocks.js";
import { serializeGemStatus, serializeUser } from "../lib/serialize.js";
import { requireAuth } from "../middleware/auth.js";

const handleParams = z.object({
  handle: z.string().min(1),
});

export async function usersRoutes(app: FastifyInstance): Promise<void> {
  app.get("/users/:handle", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = handleParams.safeParse(request.params);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid handle" });
    }

    const handle = parsed.data.handle.toLowerCase().replace(/^@/, "");
    const users = await sql<UserRow[]>`
      select id, apple_sub, email, display_name, handle,
             apple_refresh_token_enc, created_at, agreed_terms_at, banned_at
      from users
      where handle = ${handle}
      limit 1
    `;
    const user = users[0];
    if (!user) {
      return reply.code(404).send({ error: "User not found" });
    }

    if (await isBlocked(request.user.id, user.id)) {
      return reply.code(404).send({ error: "User not found" });
    }

    const [findCountRows, firstFindRows, finds] = await Promise.all([
      sql<{ count: string }[]>`
        select count(*)::text as count from finds where user_id = ${user.id}
      `,
      sql<{ count: string }[]>`
        select count(*)::text as count from gems where first_finder_id = ${user.id}
      `,
      sql`
        select
          f.id, f.gem_id, f.description, f.liked, f.disliked, f.tags, f.created_at,
          g.name as gem_name, g.category, g.find_count, g.address,
          st_y(g.location::geometry) as lat,
          st_x(g.location::geometry) as lng,
          (g.first_finder_id = ${user.id}) as is_first_find
        from finds f
        join gems g on g.id = f.gem_id
        where f.user_id = ${user.id}
        order by f.created_at desc
      `,
    ]);

    const findCount = Number(findCountRows[0]?.count ?? 0);

    return {
      user: serializeUser(
        user,
        {
          gemsUnearthed: findCount,
          firstFinds: Number(firstFindRows[0]?.count ?? 0),
          findCount,
        },
        { includeEmail: false },
      ),
      finds: finds.map((f) => ({
        id: f.id,
        gemId: f.gem_id,
        description: f.description,
        liked: f.liked,
        disliked: f.disliked,
        tags: f.tags,
        createdAt: f.created_at,
        isFirstFind: Boolean(f.is_first_find),
        gem: {
          id: f.gem_id,
          name: f.gem_name,
          category: f.category,
          address: f.address,
          lat: Number(f.lat),
          lng: Number(f.lng),
          status: serializeGemStatus(Number(f.find_count)),
        },
      })),
    };
  });
}
