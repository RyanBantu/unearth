import type { FastifyRequest } from "fastify";
import type { PendingQuery, Row } from "postgres";
import { sql } from "../db.js";
import { serializeGemStatus } from "./serialize.js";
import { FIND_COUNT_POLISHED } from "./status.js";

/**
 * Per-IP limit for signed-out reads. Signed-in app requests keep the global
 * 300/min (per token, since carrier NAT shares IPs). The website's page renderer
 * (Vercel function, shared IPs) skips it by sending X-Unearth-Prerender.
 */
export const publicRateLimit = {
  rateLimit: {
    max: (request: FastifyRequest) => (request.headers.authorization ? 300 : 120),
    timeWindow: "1 minute",
    keyGenerator: (request: FastifyRequest) =>
      request.headers.authorization ? `app:${request.headers.authorization}` : `public:${request.ip}`,
    allowList: (request: FastifyRequest) => {
      const token = process.env.PRERENDER_TOKEN;
      return Boolean(token) && request.headers["x-unearth-prerender"] === token;
    },
  },
};

/** Visible to everyone: not hidden by moderation and has at least one find. */
export const visibleGem = sql`
  gems.hidden_at is null
  and exists (select 1 from finds vf where vf.gem_id = gems.id)
`;

export type GemSort = "polished" | "top" | "new";

export function gemOrder(sort: GemSort): PendingQuery<Row[]> {
  switch (sort) {
    case "top":
      return sql`(gems.upvotes - gems.downvotes) desc, gems.find_count desc, gems.created_at desc, gems.id`;
    case "new":
      return sql`gems.created_at desc, gems.id`;
    default:
      return sql`(gems.find_count >= ${FIND_COUNT_POLISHED}) desc, (gems.upvotes - gems.downvotes) desc, gems.created_at desc, gems.id`;
  }
}

/** Gem cards for lists: place, status, net score and the first "Loved" / "Watch out" lines. */
export async function gemCards(params: {
  where: PendingQuery<Row[]>;
  order: PendingQuery<Row[]>;
  limit: number;
  offset?: number;
}) {
  const rows = await sql`
    select
      gems.id, gems.slug, gems.name, gems.category, gems.address,
      gems.city, gems.area, gems.city_slug, gems.area_slug,
      gems.find_count, gems.upvotes, gems.downvotes, gems.created_at,
      st_y(gems.location::geometry) as lat,
      st_x(gems.location::geometry) as lng,
      (select f.liked from finds f
        where f.gem_id = gems.id and f.liked is not null and f.liked <> ''
        order by f.created_at asc limit 1) as loved,
      (select f.disliked from finds f
        where f.gem_id = gems.id and f.disliked is not null and f.disliked <> ''
        order by f.created_at asc limit 1) as watch_out
    from gems
    where ${visibleGem} and ${params.where}
    order by ${params.order}
    limit ${params.limit}
    offset ${params.offset ?? 0}
  `;
  return rows.map(serializeGemCard);
}

export function serializeGemCard(g: Row) {
  return {
    id: g.id,
    slug: g.slug,
    name: g.name,
    category: g.category,
    address: g.address,
    city: g.city,
    area: g.area,
    citySlug: g.city_slug,
    areaSlug: g.area_slug,
    lat: Number(g.lat),
    lng: Number(g.lng),
    upvotes: Number(g.upvotes),
    downvotes: Number(g.downvotes),
    score: Number(g.upvotes) - Number(g.downvotes),
    createdAt: g.created_at,
    status: serializeGemStatus(Number(g.find_count)),
    loved: g.loved ?? null,
    watchOut: g.watch_out ?? null,
  };
}

/** Escape LIKE wildcards in user input. */
export function likeEscape(q: string): string {
  return q.replace(/[\\%_]/g, (c) => `\\${c}`);
}
