import type { FastifyInstance } from "fastify";
import { sql } from "../db.js";
import {
  FIND_COUNT_MINED_OUT,
  FIND_COUNT_POLISHED,
} from "../lib/status.js";
import { requireAuth } from "../middleware/auth.js";

type ActivityEvent = {
  type: "polished" | "also_found" | "mined_out";
  gemId: string;
  gemName: string;
  createdAt: Date;
  actorHandle?: string | null;
  message: string;
};

export async function activityRoutes(app: FastifyInstance): Promise<void> {
  app.get("/activity", { preHandler: requireAuth }, async (request) => {
    const userId = request.user.id;
    const events: ActivityEvent[] = [];

    // Polished: the find that brought count to 3 on a gem you first unearthed.
    const polished = await sql`
      with ordered as (
        select
          f.id,
          f.gem_id,
          f.created_at,
          f.user_id,
          g.name as gem_name,
          g.first_finder_id,
          row_number() over (partition by f.gem_id order by f.created_at asc) as rn
        from finds f
        join gems g on g.id = f.gem_id
        where g.first_finder_id = ${userId}
          and g.find_count >= ${FIND_COUNT_POLISHED}
      )
      select gem_id, gem_name, created_at
      from ordered
      where rn = ${FIND_COUNT_POLISHED}
      order by created_at desc
      limit 50
    `;

    for (const row of polished) {
      events.push({
        type: "polished",
        gemId: row.gem_id,
        gemName: row.gem_name,
        createdAt: row.created_at,
        message: `Your gem ${row.gem_name} was polished`,
      });
    }

    // Also found: someone else added a find to a gem you also found.
    const alsoFound = await sql`
      select
        f.id,
        f.gem_id,
        f.created_at,
        g.name as gem_name,
        u.handle as actor_handle
      from finds f
      join gems g on g.id = f.gem_id
      join users u on u.id = f.user_id
      where f.user_id <> ${userId}
        and exists (
          select 1 from finds mine
          where mine.gem_id = f.gem_id and mine.user_id = ${userId}
        )
      order by f.created_at desc
      limit 50
    `;

    for (const row of alsoFound) {
      const handle = row.actor_handle ? `@${row.actor_handle}` : "Someone";
      events.push({
        type: "also_found",
        gemId: row.gem_id,
        gemName: row.gem_name,
        createdAt: row.created_at,
        actorHandle: row.actor_handle,
        message: `${handle} also found ${row.gem_name}`,
      });
    }

    // Mined out: the find that brought count to 25 on a gem you found.
    const minedOut = await sql`
      with ordered as (
        select
          f.gem_id,
          f.created_at,
          g.name as gem_name,
          row_number() over (partition by f.gem_id order by f.created_at asc) as rn
        from finds f
        join gems g on g.id = f.gem_id
        where g.find_count >= ${FIND_COUNT_MINED_OUT}
          and exists (
            select 1 from finds mine
            where mine.gem_id = f.gem_id and mine.user_id = ${userId}
          )
      )
      select gem_id, gem_name, created_at
      from ordered
      where rn = ${FIND_COUNT_MINED_OUT}
      order by created_at desc
      limit 50
    `;

    for (const row of minedOut) {
      events.push({
        type: "mined_out",
        gemId: row.gem_id,
        gemName: row.gem_name,
        createdAt: row.created_at,
        message: `${row.gem_name} is now mined out`,
      });
    }

    events.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    return {
      events: events.slice(0, 100).map((e) => ({
        type: e.type,
        gemId: e.gemId,
        gemName: e.gemName,
        createdAt: e.createdAt,
        actorHandle: e.actorHandle ?? null,
        message: e.message,
      })),
    };
  });
}
