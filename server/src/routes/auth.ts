import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { sql, type UserRow } from "../db.js";
import {
  decryptAppleRefreshToken,
  encryptAppleRefreshToken,
  exchangeAppleAuthorizationCode,
  revokeAppleToken,
  verifyAppleIdentityToken,
} from "../lib/apple.js";
import { serializeUser } from "../lib/serialize.js";
import {
  issueTokenPair,
  revokeAllRefreshTokens,
  revokeRefreshToken,
  rotateRefreshToken,
} from "../lib/tokens.js";

const appleBody = z.object({
  identityToken: z.string().min(1),
  authorizationCode: z.string().min(1),
  fullName: z
    .object({
      givenName: z.string().optional(),
      familyName: z.string().optional(),
    })
    .optional(),
});

const refreshBody = z.object({
  refreshToken: z.string().min(1),
});

const logoutBody = z.object({
  refreshToken: z.string().min(1),
});

function displayNameFromFullName(
  fullName?: { givenName?: string; familyName?: string },
): string | null {
  if (!fullName) return null;
  const parts = [fullName.givenName, fullName.familyName].filter(Boolean);
  return parts.length ? parts.join(" ") : null;
}

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post("/auth/apple", async (request, reply) => {
    const parsed = appleBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid body", details: parsed.error.flatten() });
    }

    const { identityToken, authorizationCode, fullName } = parsed.data;

    let identity;
    try {
      identity = await verifyAppleIdentityToken(identityToken);
    } catch (err) {
      request.log.warn({ err }, "Apple identity verification failed");
      return reply.code(401).send({ error: "Invalid Apple identity token" });
    }

    let appleTokens;
    try {
      appleTokens = await exchangeAppleAuthorizationCode(authorizationCode);
    } catch (err) {
      request.log.warn({ err }, "Apple authorization code exchange failed");
      return reply.code(401).send({ error: "Apple authorization code exchange failed" });
    }

    const displayName = displayNameFromFullName(fullName);
    const encRefresh = appleTokens.refresh_token
      ? encryptAppleRefreshToken(appleTokens.refresh_token)
      : null;

    const existing = await sql<UserRow[]>`
      select id, apple_sub, email, display_name, handle,
             apple_refresh_token_enc, created_at
      from users
      where apple_sub = ${identity.sub}
      limit 1
    `;

    let user: UserRow;

    if (existing[0]) {
      user = existing[0];
      // Update encrypted Apple refresh token when Apple returns a new one.
      // Email / display name only on first sign-in (do not overwrite).
      if (encRefresh) {
        await sql`
          update users
          set apple_refresh_token_enc = ${encRefresh}
          where id = ${user.id}
        `;
        user = { ...user, apple_refresh_token_enc: encRefresh };
      }
    } else {
      const inserted = await sql<UserRow[]>`
        insert into users (apple_sub, email, display_name, apple_refresh_token_enc)
        values (
          ${identity.sub},
          ${identity.email ?? null},
          ${displayName},
          ${encRefresh}
        )
        returning id, apple_sub, email, display_name, handle,
                  apple_refresh_token_enc, created_at
      `;
      user = inserted[0]!;
    }

    const tokens = await issueTokenPair(user.id);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: serializeUser(user),
      needsHandle: !user.handle,
    };
  });

  app.post("/auth/refresh", async (request, reply) => {
    const parsed = refreshBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid body", details: parsed.error.flatten() });
    }

    const rotated = await rotateRefreshToken(parsed.data.refreshToken);
    if (!rotated) {
      return reply.code(401).send({ error: "Invalid or expired refresh token" });
    }

    const users = await sql<UserRow[]>`
      select id, apple_sub, email, display_name, handle,
             apple_refresh_token_enc, created_at
      from users
      where id = ${rotated.userId}
      limit 1
    `;
    const user = users[0];
    if (!user) {
      return reply.code(401).send({ error: "User not found" });
    }

    return {
      accessToken: rotated.accessToken,
      refreshToken: rotated.refreshToken,
      user: serializeUser(user),
      needsHandle: !user.handle,
    };
  });

  app.post("/auth/logout", async (request, reply) => {
    const parsed = logoutBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid body", details: parsed.error.flatten() });
    }
    await revokeRefreshToken(parsed.data.refreshToken);
    return reply.code(204).send();
  });

  /**
   * Temporary DEBUG auth for simulator / staging when Apple SIWA isn't configured.
   * Enabled only when ALLOW_DEV_AUTH=true.
   */
  app.post("/auth/dev", async (request, reply) => {
    if (process.env.ALLOW_DEV_AUTH !== "true") {
      return reply.code(404).send({ error: "Not found" });
    }

    const body = z
      .object({
        handle: z
          .string()
          .regex(/^[a-z0-9_]{3,20}$/)
          .optional(),
      })
      .safeParse(request.body ?? {});
    if (!body.success) {
      return reply.code(400).send({ error: "Invalid body", details: body.error.flatten() });
    }

    const appleSub = `dev:${body.data.handle ?? "mock"}`;
    const existing = await sql<UserRow[]>`
      select id, apple_sub, email, display_name, handle,
             apple_refresh_token_enc, created_at
      from users
      where apple_sub = ${appleSub}
      limit 1
    `;

    let user: UserRow;
    if (existing[0]) {
      user = existing[0];
    } else {
      const inserted = await sql<UserRow[]>`
        insert into users (apple_sub, email, display_name, handle)
        values (
          ${appleSub},
          ${null},
          ${"Dev User"},
          ${body.data.handle ?? "devuser"}
        )
        returning id, apple_sub, email, display_name, handle,
                  apple_refresh_token_enc, created_at
      `;
      user = inserted[0]!;
    }

    const tokens = await issueTokenPair(user.id);
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: serializeUser(user),
      needsHandle: !user.handle,
    };
  });
}

/** Used by DELETE /me — revoke Apple + wipe tokens before user delete. */
export async function revokeAppleForUser(user: UserRow): Promise<void> {
  if (user.apple_refresh_token_enc) {
    try {
      const token = decryptAppleRefreshToken(user.apple_refresh_token_enc);
      await revokeAppleToken(token);
    } catch (err) {
      console.warn("Failed to revoke Apple token on account delete", err);
    }
  }
  await revokeAllRefreshTokens(user.id);
}
