import { SignJWT, jwtVerify } from "jose";
import { randomToken, sha256Hex } from "./crypto.js";
import { sql } from "../db.js";

const ACCESS_TTL_SEC = 30 * 60; // 30 minutes
const REFRESH_TTL_MS = 60 * 24 * 60 * 60 * 1000; // 60 days

function jwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export type AccessPayload = {
  sub: string;
};

export async function signAccessToken(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${ACCESS_TTL_SEC}s`)
    .sign(jwtSecret());
}

export async function verifyAccessToken(token: string): Promise<AccessPayload> {
  const { payload } = await jwtVerify(token, jwtSecret(), {
    algorithms: ["HS256"],
  });
  if (!payload.sub) {
    throw new Error("Invalid access token: missing sub");
  }
  return { sub: payload.sub };
}

export async function issueRefreshToken(userId: string): Promise<string> {
  const token = randomToken(32);
  const tokenHash = sha256Hex(token);
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);
  await sql`
    insert into refresh_tokens (user_id, token_hash, expires_at)
    values (${userId}, ${tokenHash}, ${expiresAt})
  `;
  return token;
}

export async function issueTokenPair(userId: string): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(userId),
    issueRefreshToken(userId),
  ]);
  return { accessToken, refreshToken };
}

export async function rotateRefreshToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  userId: string;
} | null> {
  const tokenHash = sha256Hex(refreshToken);
  const rows = await sql<{
    id: string;
    user_id: string;
    expires_at: Date;
    revoked_at: Date | null;
  }[]>`
    select id, user_id, expires_at, revoked_at
    from refresh_tokens
    where token_hash = ${tokenHash}
    limit 1
  `;

  const row = rows[0];
  if (!row || row.revoked_at || row.expires_at <= new Date()) {
    return null;
  }

  await sql`
    update refresh_tokens
    set revoked_at = now()
    where id = ${row.id}
  `;

  const pair = await issueTokenPair(row.user_id);
  return { ...pair, userId: row.user_id };
}

/** Web sessions reuse refresh tokens: the opaque token lives in an HttpOnly cookie. */
export const WEB_SESSION_TTL_SEC = REFRESH_TTL_MS / 1000;

export async function sessionUserId(token: string): Promise<string | null> {
  const rows = await sql<{ user_id: string }[]>`
    select user_id
    from refresh_tokens
    where token_hash = ${sha256Hex(token)}
      and revoked_at is null
      and expires_at > now()
    limit 1
  `;
  return rows[0]?.user_id ?? null;
}

export async function revokeRefreshToken(refreshToken: string): Promise<void> {
  const tokenHash = sha256Hex(refreshToken);
  await sql`
    update refresh_tokens
    set revoked_at = now()
    where token_hash = ${tokenHash} and revoked_at is null
  `;
}

export async function revokeAllRefreshTokens(userId: string): Promise<void> {
  await sql`
    update refresh_tokens
    set revoked_at = now()
    where user_id = ${userId} and revoked_at is null
  `;
}
