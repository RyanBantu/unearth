import type { FastifyReply, FastifyRequest } from "fastify";
import { sessionUserId, verifyAccessToken } from "../lib/tokens.js";
import { sql, type UserRow } from "../db.js";
import { USER_COLUMNS } from "../lib/accountLinking.js";
import { webSignInEnabled } from "../lib/flags.js";

declare module "fastify" {
  interface FastifyRequest {
    user: UserRow;
    /** Set by `optionalAuth`; null for signed-out visitors. */
    viewer: UserRow | null;
  }
}

export const SESSION_COOKIE = "unearth_session";

/** Cookie-authenticated writes must carry this header, which cross-site forms can't set. */
export const WEB_CSRF_HEADER = "x-unearth-web";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

type AuthFailure = { status: number; error: string; fromCookie: boolean };
type AuthResult = { user: UserRow } | AuthFailure | null;

async function loadUser(userId: string): Promise<UserRow | undefined> {
  const rows = await sql<UserRow[]>`
    select ${sql.unsafe(USER_COLUMNS)}
    from users
    where id = ${userId}
    limit 1
  `;
  return rows[0];
}

async function authenticate(request: FastifyRequest): Promise<AuthResult> {
  const header = request.headers.authorization;
  if (header) {
    if (!header.startsWith("Bearer ")) {
      return { status: 401, error: "Missing or invalid Authorization header", fromCookie: false };
    }
    const token = header.slice("Bearer ".length).trim();
    if (!token) return { status: 401, error: "Missing access token", fromCookie: false };

    let sub: string;
    try {
      ({ sub } = await verifyAccessToken(token));
    } catch {
      return { status: 401, error: "Invalid or expired access token", fromCookie: false };
    }
    const user = await loadUser(sub);
    if (!user) return { status: 401, error: "User not found", fromCookie: false };
    if (user.banned_at) return { status: 403, error: "Account banned", fromCookie: false };
    return { user };
  }

  const session = webSignInEnabled() ? request.cookies?.[SESSION_COOKIE] : undefined;
  if (session) {
    if (!SAFE_METHODS.has(request.method) && request.headers[WEB_CSRF_HEADER] !== "1") {
      return { status: 403, error: "Missing X-Unearth-Web header", fromCookie: true };
    }
    const userId = await sessionUserId(session);
    if (!userId) return { status: 401, error: "Session expired", fromCookie: true };
    const user = await loadUser(userId);
    if (!user) return { status: 401, error: "User not found", fromCookie: true };
    if (user.banned_at) return { status: 403, error: "Account banned", fromCookie: true };
    return { user };
  }

  return null;
}

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const result = await authenticate(request);
  if (!result) {
    return reply.code(401).send({ error: "Sign in required" });
  }
  if ("status" in result) {
    if (result.fromCookie && result.status === 401) reply.clearCookie(SESSION_COOKIE, { path: "/" });
    return reply.code(result.status).send({ error: result.error });
  }
  request.user = result.user;
  request.viewer = result.user;
}

/**
 * Lets signed-out visitors through with `request.viewer = null`.
 * A bad bearer token still gets 401 so the iOS app refreshes it; a stale web
 * cookie is cleared and the request continues signed out.
 */
export async function optionalAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const result = await authenticate(request);
  request.viewer = null;
  if (!result) return;
  if ("status" in result) {
    if (result.fromCookie) {
      reply.clearCookie(SESSION_COOKIE, { path: "/" });
      return;
    }
    return reply.code(result.status).send({ error: result.error });
  }
  request.user = result.user;
  request.viewer = result.user;
}

/** Reject posting when the user has not agreed to Terms of Use. */
export async function requireTerms(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (!request.user.agreed_terms_at) {
    return reply.code(403).send({
      error: "You must agree to the Terms of Use before posting",
      needsTerms: true,
    });
  }
}

export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) {
    return reply.code(503).send({ error: "Admin not configured" });
  }
  const header = request.headers.authorization;
  const bearer =
    header?.startsWith("Bearer ") ? header.slice("Bearer ".length).trim() : null;
  const alt = typeof request.headers["x-admin-token"] === "string"
    ? request.headers["x-admin-token"]
    : null;
  const token = bearer || alt;
  if (!token || token !== expected) {
    return reply.code(401).send({ error: "Unauthorized" });
  }
}
