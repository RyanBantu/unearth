import type { FastifyReply, FastifyRequest } from "fastify";
import { verifyAccessToken } from "../lib/tokens.js";
import { sql, type UserRow } from "../db.js";

declare module "fastify" {
  interface FastifyRequest {
    user: UserRow;
  }
}

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return reply.code(401).send({ error: "Missing or invalid Authorization header" });
  }

  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    return reply.code(401).send({ error: "Missing access token" });
  }

  try {
    const { sub } = await verifyAccessToken(token);
    const rows = await sql<UserRow[]>`
      select
        id, apple_sub, email, display_name, handle,
        apple_refresh_token_enc, created_at, agreed_terms_at, banned_at
      from users
      where id = ${sub}
      limit 1
    `;
    const user = rows[0];
    if (!user) {
      return reply.code(401).send({ error: "User not found" });
    }
    if (user.banned_at) {
      return reply.code(403).send({ error: "Account banned" });
    }
    request.user = user;
  } catch {
    return reply.code(401).send({ error: "Invalid or expired access token" });
  }
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
