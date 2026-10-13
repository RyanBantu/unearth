import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { sql } from "../db.js";
import {
  gemCards,
  gemOrder,
  likeEscape,
  publicRateLimit,
  visibleGem,
} from "../lib/publicGems.js";
import { SLUG_REGEX } from "../lib/slug.js";
import { FIND_COUNT_POLISHED } from "../lib/status.js";

const PAGE_SIZE = 24;

const categoryEnum = z.enum(["food", "cafe", "viewpoint", "trail", "shop", "other"]);
const placeSlug = z.string().max(80).regex(SLUG_REGEX);

const cityParams = z.object({ citySlug: placeSlug });

const cityQuery = z.object({
  area: placeSlug.optional(),
  category: categoryEnum.optional(),
  sort: z.enum(["polished", "top", "new"]).default("polished"),
  page: z.coerce.number().int().min(1).max(500).default(1),
});

const searchQuery = z.object({
  q: z.string().trim().min(1).max(100),
});

type AreaRow = { city_slug: string; area_slug: string; area: string; gem_count: number; polished_count: number };

export async function publicRoutes(app: FastifyInstance): Promise<void> {
  /** Cities with at least one visible gem, each with its areas. */
  app.get("/places", { config: publicRateLimit }, async () => {
    const [cities, areas] = await Promise.all([
      sql`
        select
          city_slug,
          mode() within group (order by city) as city,
          mode() within group (order by country) as country,
          count(*)::int as gem_count,
          count(*) filter (where find_count >= ${FIND_COUNT_POLISHED})::int as polished_count
        from gems
        where ${visibleGem} and city_slug is not null
        group by city_slug
        order by gem_count desc, city_slug
      `,
      sql<AreaRow[]>`
        select
          city_slug, area_slug,
          mode() within group (order by area) as area,
          count(*)::int as gem_count,
          count(*) filter (where find_count >= ${FIND_COUNT_POLISHED})::int as polished_count
        from gems
        where ${visibleGem} and city_slug is not null and area_slug is not null
        group by city_slug, area_slug
        order by gem_count desc, area_slug
      `,
    ]);

    return {
      places: cities.map((c) => ({
        city: c.city,
        citySlug: c.city_slug,
        country: c.country,
        gemCount: c.gem_count,
        polishedCount: c.polished_count,
        areas: areas
          .filter((a) => a.city_slug === c.city_slug)
          .map((a) => ({
            area: a.area,
            areaSlug: a.area_slug,
            gemCount: a.gem_count,
            polishedCount: a.polished_count,
          })),
      })),
    };
  });

  /** One city (optionally an area / category), 24 gems per page. */
  app.get("/places/:citySlug", { config: publicRateLimit }, async (request, reply) => {
    const params = cityParams.safeParse(request.params);
    if (!params.success) return reply.code(404).send({ error: "Place not found" });
    const query = cityQuery.safeParse(request.query);
    if (!query.success) {
      return reply.code(400).send({ error: "Invalid query", details: query.error.flatten() });
    }
    const { citySlug } = params.data;
    const { area, category, sort, page } = query.data;

    const [cityRows, areaRows] = await Promise.all([
      sql`
        select
          mode() within group (order by city) as city,
          mode() within group (order by country) as country,
          count(*)::int as gem_count,
          count(*) filter (where find_count >= ${FIND_COUNT_POLISHED})::int as polished_count
        from gems
        where ${visibleGem} and city_slug = ${citySlug}
      `,
      sql<AreaRow[]>`
        select
          city_slug, area_slug,
          mode() within group (order by area) as area,
          count(*)::int as gem_count,
          count(*) filter (where find_count >= ${FIND_COUNT_POLISHED})::int as polished_count
        from gems
        where ${visibleGem} and city_slug = ${citySlug} and area_slug is not null
        group by city_slug, area_slug
        order by gem_count desc, area_slug
      `,
    ]);
    const city = cityRows[0];
    if (!city || city.gem_count === 0) return reply.code(404).send({ error: "Place not found" });

    const currentArea = area ? areaRows.find((a) => a.area_slug === area) : undefined;
    if (area && !currentArea) return reply.code(404).send({ error: "Place not found" });

    const where = sql`
      city_slug = ${citySlug}
      ${area ? sql`and area_slug = ${area}` : sql``}
      ${category ? sql`and category = ${category}` : sql``}
    `;

    const [totalRows, categoryRows, gems] = await Promise.all([
      sql<{ total: number }[]>`
        select count(*)::int as total from gems where ${visibleGem} and ${where}
      `,
      sql<{ category: string; gem_count: number }[]>`
        select category, count(*)::int as gem_count
        from gems
        where ${visibleGem} and city_slug = ${citySlug}
          ${area ? sql`and area_slug = ${area}` : sql``}
        group by category
      `,
      gemCards({
        where,
        order: gemOrder(sort),
        limit: PAGE_SIZE + 1,
        offset: (page - 1) * PAGE_SIZE,
      }),
    ]);

    return {
      place: {
        city: city.city,
        citySlug,
        country: city.country,
        area: currentArea?.area ?? null,
        areaSlug: currentArea?.area_slug ?? null,
        gemCount: currentArea?.gem_count ?? city.gem_count,
        polishedCount: currentArea?.polished_count ?? city.polished_count,
        cityGemCount: city.gem_count,
      },
      areas: areaRows.map((a) => ({
        area: a.area,
        areaSlug: a.area_slug,
        gemCount: a.gem_count,
      })),
      categories: Object.fromEntries(categoryRows.map((c) => [c.category, c.gem_count])),
      category: category ?? null,
      sort,
      page,
      pageSize: PAGE_SIZE,
      total: totalRows[0]?.total ?? 0,
      hasMore: gems.length > PAGE_SIZE,
      gems: gems.slice(0, PAGE_SIZE),
    };
  });

  /** Cities / areas (prefix + trigram) and gem names (trigram). */
  app.get("/search", { config: publicRateLimit }, async (request, reply) => {
    const parsed = searchQuery.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid query", details: parsed.error.flatten() });
    }
    const { q } = parsed.data;
    const prefix = `${likeEscape(q.toLowerCase())}%`;
    const contains = `%${likeEscape(q)}%`;

    const [places, gems] = await Promise.all([
      sql`
        with places as (
          select
            city_slug, null::text as area_slug,
            mode() within group (order by city) as city, null::text as area,
            count(*)::int as gem_count
          from gems
          where ${visibleGem} and city_slug is not null
          group by city_slug
          union all
          select
            city_slug, area_slug,
            mode() within group (order by city) as city,
            mode() within group (order by area) as area,
            count(*)::int as gem_count
          from gems
          where ${visibleGem} and city_slug is not null and area_slug is not null
          group by city_slug, area_slug
        )
        select *,
          lower(coalesce(area, city)) like ${prefix} as is_prefix,
          greatest(
            similarity(coalesce(area, city), ${q}),
            word_similarity(${q}, coalesce(area, city))
          ) as score
        from places
        where lower(coalesce(area, city)) like ${prefix}
          or similarity(coalesce(area, city), ${q}) > 0.3
          or word_similarity(${q}, coalesce(area, city)) > 0.5
        order by is_prefix desc, score desc, gem_count desc
        limit 10
      `,
      q.length < 2
        ? []
        : gemCards({
            where: sql`(gems.name ilike ${contains} or word_similarity(${q}, gems.name) > 0.4)`,
            order: sql`greatest(similarity(gems.name, ${q}), word_similarity(${q}, gems.name)) desc, gems.find_count desc, gems.id`,
            limit: 20,
          }),
    ]);

    return {
      places: places.map((p) => ({
        city: p.city,
        citySlug: p.city_slug,
        area: p.area,
        areaSlug: p.area_slug,
        gemCount: p.gem_count,
      })),
      gems,
    };
  });

  /** Everything the sitemap lists, with last-changed dates. */
  app.get("/sitemap-data", { config: publicRateLimit }, async () => {
    const gems = await sql`
      select
        gems.slug, gems.city_slug, gems.area_slug,
        greatest(gems.created_at, (select max(f.created_at) from finds f where f.gem_id = gems.id)) as updated_at
      from gems
      where ${visibleGem} and gems.slug is not null
      order by updated_at desc
    `;

    const cities = new Map<string, Date>();
    const areas = new Map<string, { citySlug: string; areaSlug: string; updatedAt: Date }>();
    for (const g of gems) {
      const updated = new Date(g.updated_at);
      if (!g.city_slug) continue;
      if (!cities.has(g.city_slug)) cities.set(g.city_slug, updated);
      if (g.area_slug) {
        const key = `${g.city_slug}/${g.area_slug}`;
        if (!areas.has(key)) areas.set(key, { citySlug: g.city_slug, areaSlug: g.area_slug, updatedAt: updated });
      }
    }

    return {
      cities: [...cities].map(([citySlug, updatedAt]) => ({ citySlug, updatedAt })),
      areas: [...areas.values()],
      gems: gems.map((g) => ({ slug: g.slug, updatedAt: g.updated_at })),
    };
  });
}
