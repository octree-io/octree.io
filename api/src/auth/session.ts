import { randomBytes, createHash } from "node:crypto";
import type { Response } from "express";
import { eq, lt } from "drizzle-orm";
import { db } from "../db/index.js";
import { sessions } from "../db/schema.js";
import { env } from "../config.js";
import type { AuthUser } from "./types.js";

export const SESSION_COOKIE = "octree_session";

const TTL_MS = env.sessionTtlDays * 24 * 60 * 60 * 1000;

const hashToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

function cookieOptions(expires: Date) {
  return {
    httpOnly: true,
    secure: env.cookie.secure,
    sameSite: env.cookie.sameSite,
    path: "/",
    expires,
  } as const;
}

/** Mint a new session for a user and return the raw cookie token. */
export async function createSession(
  userId: number,
  userAgent?: string,
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TTL_MS);
  await db.insert(sessions).values({
    tokenHash: hashToken(token),
    userId,
    userAgent: userAgent?.slice(0, 400) ?? null,
    expiresAt,
  });
  return { token, expiresAt };
}

interface ResolvedSession {
  user: AuthUser;
  tokenHash: string;
  expiresAt: Date;
}

/**
 * Resolve a raw cookie token to its user, or null if unknown/expired. Expired
 * rows are cleaned up opportunistically.
 */
export async function getSessionUser(token: string): Promise<ResolvedSession | null> {
  if (!token) return null;
  const tokenHash = hashToken(token);

  const row = await db.query.sessions.findFirst({
    where: eq(sessions.tokenHash, tokenHash),
    with: {
      user: {
        columns: { id: true, username: true, email: true, avatarUrl: true, createdAt: true },
      },
    },
  });
  if (!row) return null;

  if (row.expiresAt.getTime() <= Date.now()) {
    await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
    return null;
  }

  return { user: row.user, tokenHash, expiresAt: row.expiresAt };
}

/** Slide a session's expiry forward. Returns the new expiry. */
export async function renewSession(tokenHash: string): Promise<Date> {
  const expiresAt = new Date(Date.now() + TTL_MS);
  await db.update(sessions).set({ expiresAt }).where(eq(sessions.tokenHash, tokenHash));
  return expiresAt;
}

export async function destroySession(token: string): Promise<void> {
  if (!token) return;
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}

/** Best-effort sweep of expired sessions (call periodically). */
export async function purgeExpiredSessions(): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}

export function setSessionCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie(SESSION_COOKIE, token, cookieOptions(expiresAt));
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE, { ...cookieOptions(new Date(0)), expires: undefined });
}
