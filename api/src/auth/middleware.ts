import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../middleware/error.js";
import { env } from "../config.js";
import {
  SESSION_COOKIE,
  getSessionUser,
  renewSession,
  setSessionCookie,
} from "./session.js";
import type { AuthUser } from "./types.js";

// Slide a session forward once it passes the halfway point to expiry.
const TTL_HALF_MS = (env.sessionTtlDays * 24 * 60 * 60 * 1000) / 2;

async function resolve(req: Request, res: Response): Promise<AuthUser | null> {
  const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
  if (!token) return null;

  const resolved = await getSessionUser(token);
  if (!resolved) return null;

  const remaining = resolved.expiresAt.getTime() - Date.now();
  if (remaining < TTL_HALF_MS) {
    const expiresAt = await renewSession(resolved.tokenHash);
    setSessionCookie(res, token, expiresAt);
  }

  return resolved.user;
}

/** Attach req.user if authenticated; otherwise continue anonymously. */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await resolve(req, res);
    if (user) req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/** Require a valid session; 401 otherwise. */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await resolve(req, res);
    if (!user) throw new ApiError(401, "Not authenticated");
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Resolve a user from a raw `Cookie` header string — used by the Socket.IO
 * handshake, which has no Express req/res. Read-only (no sliding renewal).
 */
export async function userFromCookieHeader(
  cookieHeader: string | undefined,
): Promise<AuthUser | null> {
  if (!cookieHeader) return null;
  const token = parseCookie(cookieHeader, SESSION_COOKIE);
  if (!token) return null;
  const resolved = await getSessionUser(token);
  return resolved?.user ?? null;
}

function parseCookie(header: string, name: string): string | null {
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    if (part.slice(0, idx).trim() === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return null;
}
