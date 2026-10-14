import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import { sql, type UserRow } from "../db.js";
import {
  appleClientId,
  decryptAppleRefreshToken,
  exchangeAppleAuthorizationCode,
  revokeAppleToken,
  verifyAppleIdentityToken,
} from "../lib/apple.js";
import { USER_COLUMNS, upsertAppleUser, upsertGoogleUser } from "../lib/accountLinking.js";
import { serializeUser } from "../lib/serialize.js";
import {
  issueTokenPair,
  revokeAllRefreshTokens,
  revokeRefreshToken,
  issueRefreshToken,
  rotateRefreshToken,
  WEB_SESSION_TTL_SEC,
} from "../lib/tokens.js";
import { SESSION_COOKIE } from "../middleware/auth.js";
import { devAuthEnabled, webSignInEnabled } from "../lib/flags.js";
import { GoogleAudienceError, verifyGoogleIdToken } from "../lib/google.js";

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

const googleBody = z.object({
  idToken: z.string().min(1),
});

const webAppleBody = z.object({
  idToken: z.string().min(1),
  code: z.string().min(1),
  redirectUri: z.string().url(),
  user: z
    .object({
      name: z
        .object({
          firstName: z.string().optional(),
          lastName: z.string().optional(),
        })
        .optional(),
    })
    .optional(),
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

    const user = await upsertAppleUser({
      identity,
      displayName: displayNameFromFullName(fullName),
      appleRefreshToken: appleTokens.refresh_token,
      clientId: null,
    });

    if (user.banned_at) {
      return reply.code(403).send({ error: "Account banned" });
    }

    const tokens = await issueTokenPair(user.id);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: serializeUser(user),
      needsHandle: !user.handle,
      needsTerms: !user.agreed_terms_at,
    };
  });

  app.post("/auth/google", async (request, reply) => {
    const parsed = googleBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid body", details: parsed.error.flatten() });
    }

    let identity;
    try {
      identity = await verifyGoogleIdToken(parsed.data.idToken);
    } catch (err) {
      request.log.warn({ err }, "Google identity verification failed");
      const message =
        err instanceof GoogleAudienceError
          ? "Invalid Google identity token audience"
          : "Invalid Google identity token";
      return reply.code(401).send({ error: message });
    }

    if (!identity.emailVerified) {
      return reply.code(401).send({ error: "Google email is not verified" });
    }

    const user = await upsertGoogleUser(identity);
    if (user.banned_at) {
      return reply.code(403).send({ error: "Account banned" });
    }

    const tokens = await issueTokenPair(user.id);
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: serializeUser(user),
      needsHandle: !user.handle,
      needsTerms: !user.agreed_terms_at,
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
      select ${sql.unsafe(USER_COLUMNS)}
      from users
      where id = ${rotated.userId}
      limit 1
    `;
    const user = users[0];
    if (!user) {
      return reply.code(401).send({ error: "User not found" });
    }
    if (user.banned_at) {
      return reply.code(403).send({ error: "Account banned" });
    }

    return {
      accessToken: rotated.accessToken,
      refreshToken: rotated.refreshToken,
      user: serializeUser(user),
      needsHandle: !user.handle,
      needsTerms: !user.agreed_terms_at,
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

  if (webSignInEnabled()) webAuthRoutes(app);
  if (devAuthEnabled()) devAuthRoute(app);
}

/** Not registered unless WEB_SIGN_IN_ENABLED=true, so `/auth/web/*` is a plain 404. */
function webAuthRoutes(app: FastifyInstance): void {
  /** Sign in with Apple JS (popup) → HttpOnly session cookie on the site's own domain. */
  app.post("/auth/web/apple", async (request, reply) => {
    const parsed = webAppleBody.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid body", details: parsed.error.flatten() });
    }
    const { idToken, code, redirectUri, user: appleUser } = parsed.data;
    const clientId = appleClientId("web");

    let identity;
    try {
      identity = await verifyAppleIdentityToken(idToken, clientId);
    } catch (err) {
      request.log.warn({ err }, "Apple web identity verification failed");
      return reply.code(401).send({ error: "Invalid Apple identity token" });
    }

    let appleTokens;
    try {
      appleTokens = await exchangeAppleAuthorizationCode(code, { clientId, redirectUri });
    } catch (err) {
      request.log.warn({ err }, "Apple web authorization code exchange failed");
      return reply.code(401).send({ error: "Apple authorization code exchange failed" });
    }

    const user = await upsertAppleUser({
      identity,
      displayName: displayNameFromFullName({
        givenName: appleUser?.name?.firstName,
        familyName: appleUser?.name?.lastName,
      }),
      appleRefreshToken: appleTokens.refresh_token,
      clientId,
    });

    if (user.banned_at) {
      return reply.code(403).send({ error: "Account banned" });
    }

    setSessionCookie(reply, await issueRefreshToken(user.id));
    return {
      user: serializeUser(user),
      needsHandle: !user.handle,
      needsTerms: !user.agreed_terms_at,
    };
  });

  app.post("/auth/web/logout", async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE];
    if (token) await revokeRefreshToken(token);
    reply.clearCookie(SESSION_COOKIE, { path: "/" });
    return reply.code(204).send();
  });
}

/**
 * DEBUG auth for the simulator and local web dev when Apple SIWA isn't configured.
 * Registered only when NODE_ENV=development and ALLOW_DEV_AUTH=true; a 404 everywhere else.
 */
function devAuthRoute(app: FastifyInstance): void {
  app.post("/auth/dev", async (request, reply) => {
    const body = z
      .object({
        handle: z
          .string()
          .regex(/^[a-z0-9_]{3,20}$/)
          .optional(),
        web: z.boolean().optional(),
      })
      .safeParse(request.body ?? {});
    if (!body.success) {
      return reply.code(400).send({ error: "Invalid body", details: body.error.flatten() });
    }

    const appleSub = `dev:${body.data.handle ?? "mock"}`;
    const existing = await sql<UserRow[]>`
      select ${sql.unsafe(USER_COLUMNS)}
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
        returning ${sql.unsafe(USER_COLUMNS)}
      `;
      user = inserted[0]!;
    }

    if (user.banned_at) {
      return reply.code(403).send({ error: "Account banned" });
    }

    if (body.data.web && webSignInEnabled()) {
      setSessionCookie(reply, await issueRefreshToken(user.id));
      return {
        user: serializeUser(user),
        needsHandle: !user.handle,
        needsTerms: !user.agreed_terms_at,
      };
    }

    const tokens = await issueTokenPair(user.id);
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: serializeUser(user),
      needsHandle: !user.handle,
      needsTerms: !user.agreed_terms_at,
    };
  });
}

export function setSessionCookie(reply: FastifyReply, token: string): void {
  reply.setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: WEB_SESSION_TTL_SEC,
  });
}

/** Used by DELETE /me — revoke Apple + wipe tokens before user delete. */
export async function revokeAppleForUser(user: UserRow): Promise<void> {
  if (user.apple_refresh_token_enc) {
    try {
      const rows = await sql<{ apple_client_id: string | null }[]>`
        select apple_client_id from users where id = ${user.id}
      `;
      const token = decryptAppleRefreshToken(user.apple_refresh_token_enc);
      await revokeAppleToken(token, rows[0]?.apple_client_id ?? undefined);
    } catch (err) {
      console.warn("Failed to revoke Apple token on account delete", err);
    }
  }
  await revokeAllRefreshTokens(user.id);
}
