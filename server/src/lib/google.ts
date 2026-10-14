import { OAuth2Client } from "google-auth-library";

export type GoogleIdentity = {
  sub: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
};

export class GoogleAudienceError extends Error {
  constructor() {
    super("Google ID token audience mismatch");
    this.name = "GoogleAudienceError";
  }
}

type Verifier = (idToken: string, audience: string) => Promise<GoogleIdentity>;

let override: Verifier | null = null;

/** Tests replace the real Google call. */
export function setGoogleIdTokenVerifier(fn: Verifier | null): void {
  override = fn;
}

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdentity> {
  const audience = process.env.GOOGLE_WEB_CLIENT_ID;
  if (!audience) throw new Error("GOOGLE_WEB_CLIENT_ID is not set");

  if (override) return override(idToken, audience);

  const client = new OAuth2Client(audience);
  const ticket = await client.verifyIdToken({ idToken, audience });
  const payload = ticket.getPayload();
  if (!payload?.sub) throw new Error("Google ID token missing sub");
  if (payload.aud !== audience) throw new GoogleAudienceError();

  return {
    sub: payload.sub,
    email: payload.email ?? null,
    emailVerified: payload.email_verified === true,
    name: payload.name ?? null,
  };
}
