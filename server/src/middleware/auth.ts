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
      select id, apple_sub, email, display_name, handle,
             apple_refresh_token_enc, created_at
      from users
      where id = ${sub}
      limit 1
    `;
    const user = rows[0];
    if (!user) {
      return reply.code(401).send({ error: "User not found" });
    }
    request.user = user;
  } catch {
    return reply.code(401).send({ error: "Invalid or expired access token" });
  }
}
