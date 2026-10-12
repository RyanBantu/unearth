import { createRemoteJWKSet, SignJWT, jwtVerify } from "jose";
import { createPrivateKey } from "node:crypto";
import { decrypt, encrypt } from "./crypto.js";

const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_JWKS = createRemoteJWKSet(
  new URL("https://appleid.apple.com/auth/keys"),
);

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is not set`);
  return v;
}

function normalizePrivateKey(raw: string): string {
  return raw.replace(/\\n/g, "\n").trim();
}

export type AppleIdentity = {
  sub: string;
  email?: string;
};

export async function verifyAppleIdentityToken(
  identityToken: string,
): Promise<AppleIdentity> {
  const bundleId = requireEnv("APPLE_BUNDLE_ID");
  const { payload } = await jwtVerify(identityToken, APPLE_JWKS, {
    issuer: APPLE_ISSUER,
    audience: bundleId,
  });

  if (!payload.sub || typeof payload.sub !== "string") {
    throw new Error("Apple identity token missing sub");
  }

  return {
    sub: payload.sub,
    email: typeof payload.email === "string" ? payload.email : undefined,
  };
}

async function createAppleClientSecret(): Promise<string> {
  const teamId = requireEnv("APPLE_TEAM_ID");
  const keyId = requireEnv("APPLE_KEY_ID");
  const bundleId = requireEnv("APPLE_BUNDLE_ID");
  const privateKeyPem = normalizePrivateKey(requireEnv("APPLE_PRIVATE_KEY"));
  const key = createPrivateKey(privateKeyPem);

  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setIssuedAt()
    .setExpirationTime("5m")
    .setAudience(APPLE_ISSUER)
    .setSubject(bundleId)
    .sign(key);
}

export type AppleTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  id_token?: string;
  expires_in?: number;
  token_type?: string;
};

export async function exchangeAppleAuthorizationCode(
  authorizationCode: string,
): Promise<AppleTokenResponse> {
  const clientSecret = await createAppleClientSecret();
  const body = new URLSearchParams({
    client_id: requireEnv("APPLE_BUNDLE_ID"),
    client_secret: clientSecret,
    code: authorizationCode,
    grant_type: "authorization_code",
  });

  const res = await fetch("https://appleid.apple.com/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apple token exchange failed: ${res.status} ${text}`);
  }

  return (await res.json()) as AppleTokenResponse;
}

export async function revokeAppleToken(refreshToken: string): Promise<void> {
  const clientSecret = await createAppleClientSecret();
  const body = new URLSearchParams({
    client_id: requireEnv("APPLE_BUNDLE_ID"),
    client_secret: clientSecret,
    token: refreshToken,
    token_type_hint: "refresh_token",
  });

  const res = await fetch("https://appleid.apple.com/auth/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  // Apple returns 200 on success; treat non-2xx as soft failure for cleanup.
  if (!res.ok) {
    const text = await res.text();
    console.warn(`Apple revoke failed: ${res.status} ${text}`);
  }
}

export function encryptAppleRefreshToken(token: string): string {
  return encrypt(token);
}

export function decryptAppleRefreshToken(enc: string): string {
  return decrypt(enc);
}
