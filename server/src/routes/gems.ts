import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { sql } from "../db.js";
import type { PendingQuery, Row } from "postgres";
import { findDuplicateCandidates } from "../lib/matching.js";
import {
  serializeGemStatus,
  serializeMatchCandidate,
} from "../lib/serialize.js";
import {
  ALLOWED_TAGS,
  DUPLICATE_CONFLICT_NAME_SIM,
  MATCH_RADIUS_M,
} from "../lib/status.js";
import { clearVote, getMyVote, setVote } from "../lib/votes.js";
import { isGemHiddenFromViewer } from "../lib/blocks.js";
import { optionalAuth, requireAuth, requireTerms } from "../middleware/auth.js";
import { gemSlug, isSlugConflict, SLUG_REGEX } from "../lib/slug.js";
import type { UserRow } from "../db.js";
import { fillPlaceInBackground, placeColumns } from "../lib/places.js";
import { publicRateLimit } from "../lib/publicGems.js";

const categoryEnum = z.enum([
  "food",
  "cafe",
  "viewpoint",
  "trail",
  "shop",
  "other",
]);

const tagsSchema = z
  .array(z.enum(ALLOWED_TAGS))
  .max(5)
  .default([]);

const nearbyQuery = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius_m: z.coerce.number().positive().max(50_000).default(5000),
  category: categoryEnum.optional(),
});

const matchQuery = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  name: z.string().trim().min(1).max(200),
  category: categoryEnum,
  applePlaceId: z.string().min(1).optional(),
  googlePlaceId: z.string().min(1).optional(),
});

const gemIdParams = z.object({
  id: z.string().uuid(),
});

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const gemIdOrSlugParams = z.object({
  id: z.string().max(80).refine((v) => UUID_REGEX.test(v) || SLUG_REGEX.test(v)),
});

const placeField = z.string().trim().max(120).optional().nullable();

const createGemBody = z.object({
  name: z.string().trim().min(1).max(200),
  category: categoryEnum,
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().trim().max(500).optional().nullable(),
  applePlaceId: z.string().min(1).optional().nullable(),
  googlePlaceId: z.string().min(1).optional().nullable(),
  googleMapsUrl: z
    .string()
    .url()
    .refine(
      (u) => /google\.[^/]+\/maps|maps\.google\.|goo\.gl\/maps|maps\.app\.goo\.gl/i.test(u),
      "Must be a Google Maps URL",
    )
    .optional()
    .nullable(),
  description: z.string().trim().min(10).max(600),
  liked: z.string().trim().max(140).optional().nullable(),
  disliked: z.string().trim().max(140).optional().nullable(),
  tags: tagsSchema,
  confirmedNew: z.boolean().optional(),
  /** Optional, e.g. from CLGeocoder; otherwise the server reverse-geocodes. */
  city: placeField,
  area: placeField,
  country: placeField,
});

const createFindBody = z.object({
  description: z.string().trim().min(10).max(600),
  liked: z.string().trim().max(140).optional().nullable(),
  disliked: z.string().trim().max(140).optional().nullable(),
  tags: tagsSchema,
});

const voteBody = z.object({
  value: z.union([z.literal(1), z.literal(-1)]),
});

/** Use Authorization (available before auth preHandler) so per-user limits work with onRequest rate-limit. */
function rateLimitByUser(request: FastifyRequest): string {
  const auth = request.headers.authorization;
  return auth ? `create:${auth}` : `create:ip:${request.ip}`;
}

function voteRateLimitByUser(request: FastifyRequest): string {
  const auth = request.headers.authorization;
  return auth ? `vote:${auth}` : `vote:ip:${request.ip}`;
}

/** Gem + visible finds for this viewer (signed out when null), or null if missing / hidden. */
async function gemDetail(where: PendingQuery<Row[]>, viewer: UserRow | null) {
  const gems = await sql`
    select
      id, slug, name, category, address, apple_place_id, google_place_id, google_maps_url,
      first_finder_id, find_count, upvotes, downvotes, created_at,
      city, area, country, city_slug, area_slug,
      st_y(location::geometry) as lat,
      st_x(location::geometry) as lng
    from gems
    where ${where}
    limit 1
  `;
  const gem = gems[0];
  if (!gem) return null;

  const viewerId = viewer?.id ?? null;
  if (await isGemHiddenFromViewer(viewerId, gem.id as string)) return null;

  const [finds, stashRows, myVote] = await Promise.all([
    sql`
      select
        f.id, f.gem_id, f.user_id, f.description, f.liked, f.disliked,
        f.tags, f.created_at,
        u.handle, u.display_name
      from finds f
      join users u on u.id = f.user_id
      where f.gem_id = ${gem.id}
        and not exists (
          select 1 from blocks b
          where b.blocker_id = ${viewerId} and b.blocked_id = f.user_id
        )
        and not exists (
          select 1 from reports r
          where r.reporter_id = ${viewerId} and r.find_id = f.id
        )
      order by f.created_at asc
    `,
    viewerId
      ? sql<{ gem_id: string }[]>`
          select gem_id from stash
          where user_id = ${viewerId} and gem_id = ${gem.id}
          limit 1
        `
      : [],
    viewerId ? getMyVote(gem.id as string, viewerId) : null,
  ]);
  const myFind = viewerId ? finds.find((f) => f.user_id === viewerId) : undefined;
  const firstFind = finds.find((f) => f.user_id === gem.first_finder_id);

  return {
    id: gem.id,
    slug: gem.slug,
    name: gem.name,
    category: gem.category,
    address: gem.address,
    city: gem.city,
    area: gem.area,
    country: gem.country,
    citySlug: gem.city_slug,
    areaSlug: gem.area_slug,
    findCount: Number(gem.find_count),
    firstFinderHandle: firstFind?.handle ?? null,
    applePlaceId: gem.apple_place_id,
    googlePlaceId: gem.google_place_id ?? null,
    googleMapsUrl: gem.google_maps_url,
    firstFinderId: gem.first_finder_id,
    createdAt: gem.created_at,
    lat: Number(gem.lat),
    lng: Number(gem.lng),
    status: serializeGemStatus(Number(gem.find_count)),
    upvotes: Number(gem.upvotes),
    downvotes: Number(gem.downvotes),
    myVote,
    isStashed: stashRows.length > 0,
    myFindId: myFind?.id ?? null,
    finds: finds.map((f) => ({
      id: f.id,
      gemId: f.gem_id,
      userId: f.user_id,
      description: f.description,
      liked: f.liked,
      disliked: f.disliked,
      tags: f.tags,
      createdAt: f.created_at,
      handle: f.handle,
      // Apple names are often real names: only shown to signed-in app users.
      displayName: viewer ? f.display_name : null,
      isFirstFind: f.user_id === gem.first_finder_id,
    })),
  };
}

export async function gemsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/gems/nearby", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = nearbyQuery.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid query", details: parsed.error.flatten() });
    }

    const { lat, lng, radius_m, category } = parsed.data;
    const viewerId = request.user.id;

    const rows = category
      ? await sql`
          select
            id, slug, name, category, address, apple_place_id, google_maps_url,
            first_finder_id, find_count, upvotes, downvotes, created_at,
            st_y(location::geometry) as lat,
            st_x(location::geometry) as lng,
            st_distance(location, st_makepoint(${lng}, ${lat})::geography) as distance_m
          from gems
          where st_dwithin(
            location,
            st_makepoint(${lng}, ${lat})::geography,
            ${radius_m}
          )
            and category = ${category}
            and hidden_at is null
            and not exists (
              select 1 from reports r
              where r.reporter_id = ${viewerId}
                and r.gem_id = gems.id
                and r.find_id is null
            )
            and exists (
              select 1 from finds f
              where f.gem_id = gems.id
                and not exists (
                  select 1 from blocks b
                  where b.blocker_id = ${viewerId} and b.blocked_id = f.user_id
                )
                and not exists (
                  select 1 from reports r
                  where r.reporter_id = ${viewerId} and r.find_id = f.id
                )
            )
          order by distance_m asc
          limit 100
        `
      : await sql`
          select
            id, slug, name, category, address, apple_place_id, google_maps_url,
            first_finder_id, find_count, upvotes, downvotes, created_at,
            st_y(location::geometry) as lat,
            st_x(location::geometry) as lng,
            st_distance(location, st_makepoint(${lng}, ${lat})::geography) as distance_m
          from gems
          where st_dwithin(
            location,
            st_makepoint(${lng}, ${lat})::geography,
            ${radius_m}
          )
            and hidden_at is null
            and not exists (
              select 1 from reports r
              where r.reporter_id = ${viewerId}
                and r.gem_id = gems.id
                and r.find_id is null
            )
            and exists (
              select 1 from finds f
              where f.gem_id = gems.id
                and not exists (
                  select 1 from blocks b
                  where b.blocker_id = ${viewerId} and b.blocked_id = f.user_id
                )
                and not exists (
                  select 1 from reports r
                  where r.reporter_id = ${viewerId} and r.find_id = f.id
                )
            )
          order by distance_m asc
          limit 100
        `;

    return {
      gems: rows.map((g) => ({
        id: g.id,
        slug: g.slug,
        name: g.name,
        category: g.category,
        address: g.address,
        applePlaceId: g.apple_place_id,
        googleMapsUrl: g.google_maps_url,
        firstFinderId: g.first_finder_id,
        createdAt: g.created_at,
        lat: Number(g.lat),
        lng: Number(g.lng),
        distanceM: Number(g.distance_m),
        upvotes: Number(g.upvotes),
        downvotes: Number(g.downvotes),
        status: serializeGemStatus(Number(g.find_count)),
      })),
      matchRadiiM: MATCH_RADIUS_M,
    };
  });

  app.get("/gems/match", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = matchQuery.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid query", details: parsed.error.flatten() });
    }

    const { lat, lng, name, category, applePlaceId, googlePlaceId } = parsed.data;
    const candidates = await findDuplicateCandidates({
      lat,
      lng,
      name,
      category,
      applePlaceId,
      googlePlaceId,
    });

    return {
      candidates: candidates.map(serializeMatchCandidate),
      radiusM: MATCH_RADIUS_M[category],
    };
  });

  /** Public: `:id` is a gem UUID (iOS) or slug (website). */
  app.get(
    "/gems/:id",
    { preHandler: optionalAuth, config: publicRateLimit },
    async (request, reply) => {
    const parsed = gemIdOrSlugParams.safeParse(request.params);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid gem id" });
    }
    const { id } = parsed.data;
    const where = UUID_REGEX.test(id) ? sql`id = ${id}` : sql`slug = ${id}`;
    const detail = await gemDetail(where, request.viewer);
    if (!detail) return reply.code(404).send({ error: "Gem not found" });
    return detail;
    },
  );

  app.post(
    "/gems",
    {
      preHandler: [requireAuth, requireTerms],
      config: {
        rateLimit: {
          max: 20,
          timeWindow: "1 hour",
          keyGenerator: rateLimitByUser,
        },
      },
    },
    async (request, reply) => {
      const parsed = createGemBody.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "Invalid body", details: parsed.error.flatten() });
      }

      const body = parsed.data;
      const candidates = await findDuplicateCandidates({
        lat: body.lat,
        lng: body.lng,
        name: body.name,
        category: body.category,
        applePlaceId: body.applePlaceId,
        googlePlaceId: body.googlePlaceId,
      });

      const strong = candidates.filter(
        (c) => Number(c.name_sim) > DUPLICATE_CONFLICT_NAME_SIM,
      );
      // Exact Apple or Google Place ID match is always a strong conflict unless confirmedNew.
      const placeExact =
        (body.applePlaceId || body.googlePlaceId) &&
        candidates.length === 1 &&
        Number(candidates[0]!.name_sim) >= 1;

      if ((strong.length > 0 || placeExact) && !body.confirmedNew) {
        return reply.code(409).send({
          error: "Possible duplicate gem",
          candidates: candidates.map(serializeMatchCandidate),
        });
      }

      const clientPlace = body.city ? placeColumns({
        city: body.city,
        area: body.area ?? null,
        country: body.country ?? null,
      }) : null;

      const insert = (slug: string) => sql.begin(async (tx) => {
          const gems = await tx`
            insert into gems (
              name, slug, category, location, address, apple_place_id, google_place_id,
              google_maps_url, first_finder_id, find_count,
              city, area, country, city_slug, area_slug
            )
            values (
              ${body.name},
              ${slug},
              ${body.category},
              st_makepoint(${body.lng}, ${body.lat})::geography,
              ${body.address ?? null},
              ${body.applePlaceId ?? null},
              ${body.googlePlaceId ?? null},
              ${body.googleMapsUrl ?? null},
              ${request.user.id},
              1,
              ${clientPlace?.city ?? null},
              ${clientPlace?.area ?? null},
              ${clientPlace?.country ?? null},
              ${clientPlace?.city_slug ?? null},
              ${clientPlace?.area_slug ?? null}
            )
            returning
              id, slug, name, category, address, apple_place_id, google_place_id, google_maps_url,
              first_finder_id, find_count, created_at,
              st_y(location::geometry) as lat,
              st_x(location::geometry) as lng
          `;
          const gem = gems[0]!;

          const finds = await tx`
            insert into finds (
              gem_id, user_id, description, liked, disliked, tags
            )
            values (
              ${gem.id},
              ${request.user.id},
              ${body.description},
              ${body.liked ?? null},
              ${body.disliked ?? null},
              ${body.tags}
            )
            returning id, gem_id, user_id, description, liked, disliked, tags, created_at
          `;

          return { gem, find: finds[0]! };
        });

      try {
        let result: Awaited<ReturnType<typeof insert>> | undefined;
        for (let attempt = 0; !result; attempt++) {
          try {
            result = await insert(gemSlug(body.name, attempt < 2 ? 4 : 8));
          } catch (err) {
            if (!isSlugConflict(err) || attempt >= 3) throw err;
          }
        }

        if (!clientPlace) {
          fillPlaceInBackground(result.gem.id as string, body.lat, body.lng, request.log);
        }

        return reply.code(201).send({
          id: result.gem.id,
          slug: result.gem.slug,
          name: result.gem.name,
          category: result.gem.category,
          address: result.gem.address,
          applePlaceId: result.gem.apple_place_id,
          googlePlaceId: result.gem.google_place_id ?? null,
          googleMapsUrl: result.gem.google_maps_url,
          firstFinderId: result.gem.first_finder_id,
          createdAt: result.gem.created_at,
          lat: Number(result.gem.lat),
          lng: Number(result.gem.lng),
          status: serializeGemStatus(Number(result.gem.find_count)),
          myFindId: result.find.id,
          find: {
            id: result.find.id,
            gemId: result.find.gem_id,
            userId: result.find.user_id,
            description: result.find.description,
            liked: result.find.liked,
            disliked: result.find.disliked,
            tags: result.find.tags,
            createdAt: result.find.created_at,
          },
        });
      } catch (err: unknown) {
        // Unique apple_place_id race
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("gems_apple_place_id_key")) {
          return reply.code(409).send({
            error: "A gem with this Apple Place ID already exists",
          });
        }
        if (message.includes("gems_google_place_id_key")) {
          return reply.code(409).send({
            error: "A gem with this Google Place ID already exists",
          });
        }
        throw err;
      }
    },
  );

  app.post(
    "/gems/:id/finds",
    {
      preHandler: [requireAuth, requireTerms],
      config: {
        rateLimit: {
          max: 20,
          timeWindow: "1 hour",
          keyGenerator: rateLimitByUser,
        },
      },
    },
    async (request, reply) => {
      const params = gemIdParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: "Invalid gem id" });
      }
      const body = createFindBody.safeParse(request.body);
      if (!body.success) {
        return reply.code(400).send({ error: "Invalid body", details: body.error.flatten() });
      }

      const gems = await sql<{ id: string; find_count: number }[]>`
        select id, find_count from gems where id = ${params.data.id} limit 1
      `;
      if (!gems[0]) {
        return reply.code(404).send({ error: "Gem not found" });
      }

      const existing = await sql<{ id: string }[]>`
        select id from finds
        where gem_id = ${params.data.id} and user_id = ${request.user.id}
        limit 1
      `;
      if (existing[0]) {
        return reply.code(409).send({
          error: "You already have a find on this gem",
          myFindId: existing[0].id,
        });
      }

      try {
        const result = await sql.begin(async (tx) => {
          const finds = await tx`
            insert into finds (
              gem_id, user_id, description, liked, disliked, tags
            )
            values (
              ${params.data.id},
              ${request.user.id},
              ${body.data.description},
              ${body.data.liked ?? null},
              ${body.data.disliked ?? null},
              ${body.data.tags}
            )
            returning id, gem_id, user_id, description, liked, disliked, tags, created_at
          `;

          const updated = await tx`
            update gems
            set find_count = (
              select count(*)::int from finds where gem_id = ${params.data.id}
            )
            where id = ${params.data.id}
            returning find_count
          `;

          return { find: finds[0]!, findCount: Number(updated[0]!.find_count) };
        });

        return reply.code(201).send({
          find: {
            id: result.find.id,
            gemId: result.find.gem_id,
            userId: result.find.user_id,
            description: result.find.description,
            liked: result.find.liked,
            disliked: result.find.disliked,
            tags: result.find.tags,
            createdAt: result.find.created_at,
          },
          status: serializeGemStatus(result.findCount),
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes("finds_gem_id_user_id_key")) {
          return reply.code(409).send({ error: "You already have a find on this gem" });
        }
        throw err;
      }
    },
  );

  app.put(
    "/gems/:id/vote",
    {
      preHandler: requireAuth,
      config: {
        rateLimit: {
          max: 60,
          timeWindow: "1 hour",
          keyGenerator: voteRateLimitByUser,
        },
      },
    },
    async (request, reply) => {
      const params = gemIdParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: "Invalid gem id" });
      }
      const body = voteBody.safeParse(request.body);
      if (!body.success) {
        return reply.code(400).send({ error: "Invalid body", details: body.error.flatten() });
      }

      try {
        return await setVote({
          gemId: params.data.id,
          userId: request.user.id,
          value: body.data.value,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (message === "GEM_NOT_FOUND") {
          return reply.code(404).send({ error: "Gem not found" });
        }
        if (message === "VOTE_FORBIDDEN") {
          return reply.code(403).send({
            error: "You can't vote on a gem you unearthed or found",
          });
        }
        throw err;
      }
    },
  );

  app.delete(
    "/gems/:id/vote",
    {
      preHandler: requireAuth,
      config: {
        rateLimit: {
          max: 60,
          timeWindow: "1 hour",
          keyGenerator: voteRateLimitByUser,
        },
      },
    },
    async (request, reply) => {
      const params = gemIdParams.safeParse(request.params);
      if (!params.success) {
        return reply.code(400).send({ error: "Invalid gem id" });
      }

      try {
        return await clearVote({
          gemId: params.data.id,
          userId: request.user.id,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (message === "GEM_NOT_FOUND") {
          return reply.code(404).send({ error: "Gem not found" });
        }
        if (message === "VOTE_FORBIDDEN") {
          return reply.code(403).send({
            error: "You can't vote on a gem you unearthed or found",
          });
        }
        throw err;
      }
    },
  );
}
