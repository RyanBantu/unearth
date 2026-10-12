import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { sql } from "../db.js";
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
import { requireAuth } from "../middleware/auth.js";

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
});

const gemIdParams = z.object({
  id: z.string().uuid(),
});

const createGemBody = z.object({
  name: z.string().trim().min(1).max(200),
  category: categoryEnum,
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().trim().max(500).optional().nullable(),
  applePlaceId: z.string().min(1).optional().nullable(),
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
});

const createFindBody = z.object({
  description: z.string().trim().min(10).max(600),
  liked: z.string().trim().max(140).optional().nullable(),
  disliked: z.string().trim().max(140).optional().nullable(),
  tags: tagsSchema,
});

/** Use Authorization (available before auth preHandler) so per-user limits work with onRequest rate-limit. */
function rateLimitByUser(request: FastifyRequest): string {
  const auth = request.headers.authorization;
  return auth ? `create:${auth}` : `create:ip:${request.ip}`;
}

export async function gemsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/gems/nearby", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = nearbyQuery.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid query", details: parsed.error.flatten() });
    }

    const { lat, lng, radius_m, category } = parsed.data;

    const rows = category
      ? await sql`
          select
            id, name, category, address, apple_place_id, google_maps_url,
            first_finder_id, find_count, created_at,
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
          order by distance_m asc
          limit 100
        `
      : await sql`
          select
            id, name, category, address, apple_place_id, google_maps_url,
            first_finder_id, find_count, created_at,
            st_y(location::geometry) as lat,
            st_x(location::geometry) as lng,
            st_distance(location, st_makepoint(${lng}, ${lat})::geography) as distance_m
          from gems
          where st_dwithin(
            location,
            st_makepoint(${lng}, ${lat})::geography,
            ${radius_m}
          )
          order by distance_m asc
          limit 100
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
        distanceM: Number(g.distance_m),
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

    const { lat, lng, name, category, applePlaceId } = parsed.data;
    const candidates = await findDuplicateCandidates({
      lat,
      lng,
      name,
      category,
      applePlaceId,
    });

    return {
      candidates: candidates.map(serializeMatchCandidate),
      radiusM: MATCH_RADIUS_M[category],
    };
  });

  app.get("/gems/:id", { preHandler: requireAuth }, async (request, reply) => {
    const parsed = gemIdParams.safeParse(request.params);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid gem id" });
    }

    const gems = await sql`
      select
        id, name, category, address, apple_place_id, google_maps_url,
        first_finder_id, find_count, created_at,
        st_y(location::geometry) as lat,
        st_x(location::geometry) as lng
      from gems
      where id = ${parsed.data.id}
      limit 1
    `;
    const gem = gems[0];
    if (!gem) {
      return reply.code(404).send({ error: "Gem not found" });
    }

    const [finds, stashRows, myFind] = await Promise.all([
      sql`
        select
          f.id, f.gem_id, f.user_id, f.description, f.liked, f.disliked,
          f.tags, f.created_at,
          u.handle, u.display_name
        from finds f
        join users u on u.id = f.user_id
        where f.gem_id = ${gem.id}
        order by f.created_at asc
      `,
      sql<{ gem_id: string }[]>`
        select gem_id from stash
        where user_id = ${request.user.id} and gem_id = ${gem.id}
        limit 1
      `,
      sql<{ id: string }[]>`
        select id from finds
        where gem_id = ${gem.id} and user_id = ${request.user.id}
        limit 1
      `,
    ]);

    return {
      id: gem.id,
      name: gem.name,
      category: gem.category,
      address: gem.address,
      applePlaceId: gem.apple_place_id,
      googleMapsUrl: gem.google_maps_url,
      firstFinderId: gem.first_finder_id,
      createdAt: gem.created_at,
      lat: Number(gem.lat),
      lng: Number(gem.lng),
      status: serializeGemStatus(Number(gem.find_count)),
      isStashed: stashRows.length > 0,
      myFindId: myFind[0]?.id ?? null,
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
        displayName: f.display_name,
        isFirstFind: f.user_id === gem.first_finder_id,
      })),
    };
  });

  app.post(
    "/gems",
    {
      preHandler: requireAuth,
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
      });

      const strong = candidates.filter(
        (c) => Number(c.name_sim) > DUPLICATE_CONFLICT_NAME_SIM,
      );
      // Exact Apple Place ID match is always a strong conflict unless confirmedNew.
      const appleExact = body.applePlaceId && candidates.length === 1 && Number(candidates[0]!.name_sim) >= 1;

      if ((strong.length > 0 || appleExact) && !body.confirmedNew) {
        return reply.code(409).send({
          error: "Possible duplicate gem",
          candidates: candidates.map(serializeMatchCandidate),
        });
      }

      try {
        const result = await sql.begin(async (tx) => {
          const gems = await tx`
            insert into gems (
              name, category, location, address, apple_place_id,
              google_maps_url, first_finder_id, find_count
            )
            values (
              ${body.name},
              ${body.category},
              st_makepoint(${body.lng}, ${body.lat})::geography,
              ${body.address ?? null},
              ${body.applePlaceId ?? null},
              ${body.googleMapsUrl ?? null},
              ${request.user.id},
              1
            )
            returning
              id, name, category, address, apple_place_id, google_maps_url,
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

        return reply.code(201).send({
          id: result.gem.id,
          name: result.gem.name,
          category: result.gem.category,
          address: result.gem.address,
          applePlaceId: result.gem.apple_place_id,
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
        throw err;
      }
    },
  );

  app.post(
    "/gems/:id/finds",
    {
      preHandler: requireAuth,
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
}
