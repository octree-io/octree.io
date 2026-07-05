import { randomBytes, createHash } from "node:crypto";
import { OAuth2Client, CodeChallengeMethod } from "google-auth-library";
import { env } from "../config.js";

const client = new OAuth2Client({
  clientId: env.google.clientId,
  clientSecret: env.google.clientSecret,
  redirectUri: env.google.redirectUri,
});

const base64url = (buf: Buffer): string => buf.toString("base64url");

/** Random value for the OAuth `state` (CSRF) parameter. */
export function randomState(): string {
  return base64url(randomBytes(24));
}

/** PKCE verifier + its S256 challenge. */
export function pkce(): { verifier: string; challenge: string } {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export function buildAuthUrl(state: string, challenge: string): string {
  return client.generateAuthUrl({
    scope: ["openid", "email", "profile"],
    state,
    code_challenge_method: CodeChallengeMethod.S256,
    code_challenge: challenge,
    prompt: "select_account",
  });
}

export interface GoogleProfile {
  googleId: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
}

/** Exchange the auth code (with PKCE verifier) and verify the returned ID token. */
export async function exchangeAndVerify(
  code: string,
  codeVerifier: string,
): Promise<GoogleProfile> {
  const { tokens } = await client.getToken({
    code,
    codeVerifier,
    redirect_uri: env.google.redirectUri,
  });
  if (!tokens.id_token) throw new Error("Google did not return an id_token");

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: env.google.clientId,
  });
  const p = ticket.getPayload();
  if (!p?.sub || !p.email) throw new Error("Google token missing sub/email");

  return {
    googleId: p.sub,
    email: p.email,
    emailVerified: Boolean(p.email_verified),
    name: p.name ?? null,
    picture: p.picture ?? null,
  };
}
