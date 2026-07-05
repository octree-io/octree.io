import { Router } from "express";
import { randomBytes } from "node:crypto";
import { eq, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { ApiError } from "../middleware/error.js";
import { env, googleEnabled } from "../config.js";
import { hashPassword, verifyPassword } from "../auth/password.js";
import {
  createSession,
  setSessionCookie,
  destroySession,
  clearSessionCookie,
  SESSION_COOKIE,
} from "../auth/session.js";
import { requireAuth } from "../auth/middleware.js";
import type { AuthUser } from "../auth/types.js";
import {
  buildAuthUrl,
  exchangeAndVerify,
  pkce,
  randomState,
  type GoogleProfile,
} from "../auth/google.js";

export const authRouter = Router();

type UserRow = typeof users.$inferSelect;

function toAuthUser(u: UserRow): AuthUser {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    avatarUrl: u.avatarUrl,
    createdAt: u.createdAt,
  };
}

// Issue a session + cookie for a freshly authenticated user.
async function startSession(res: import("express").Response, userId: number, userAgent?: string) {
  const { token, expiresAt } = await createSession(userId, userAgent);
  setSessionCookie(res, token, expiresAt);
}

/* ─── email + password ─────────────────────────────────────────────────────── */

const registerSchema = z.object({
  username: z.string().regex(/^[a-zA-Z0-9_-]{3,32}$/, "3–32 chars: letters, numbers, _ or -"),
  email: z.string().email().max(254),
  password: z.string().min(8, "At least 8 characters").max(200),
});

authRouter.post("/register", async (req, res, next) => {
  try {
    const { username, email, password } = registerSchema.parse(req.body);
    const normEmail = email.toLowerCase();

    const clash = await db.query.users.findFirst({
      where: or(eq(users.email, normEmail), eq(users.username, username)),
      columns: { email: true, username: true },
    });
    if (clash) {
      throw new ApiError(409, clash.email === normEmail ? "Email already in use" : "Username taken");
    }

    const passwordHash = await hashPassword(password);
    const [user] = await db
      .insert(users)
      .values({ username, email: normEmail, passwordHash })
      .returning();

    await startSession(res, user.id, req.headers["user-agent"]);
    res.status(201).json(toAuthUser(user));
  } catch (err) {
    next(err);
  }
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });
    // Generic error for both "no such user" and "wrong password".
    if (!user || !user.passwordHash || !(await verifyPassword(user.passwordHash, password))) {
      throw new ApiError(401, "Invalid email or password");
    }

    await startSession(res, user.id, req.headers["user-agent"]);
    res.json(toAuthUser(user));
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", async (req, res, next) => {
  try {
    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
    if (token) await destroySession(token);
    clearSessionCookie(res);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json(req.user);
});

const updateMeSchema = z.object({
  username: z.string().regex(/^[a-zA-Z0-9_-]{3,15}$/, "3–15 chars: letters, numbers, _ or -"),
});

// PATCH /me — update the signed-in user's profile (currently just username).
authRouter.patch("/me", requireAuth, async (req, res, next) => {
  try {
    const { username } = updateMeSchema.parse(req.body);
    const me = req.user!;

    if (username !== me.username) {
      const taken = await db.query.users.findFirst({
        where: eq(users.username, username),
        columns: { id: true },
      });
      if (taken) throw new ApiError(409, "Username taken");
    }

    const [updated] = await db
      .update(users)
      .set({ username, updatedAt: new Date() })
      .where(eq(users.id, me.id))
      .returning();

    res.json(toAuthUser(updated));
  } catch (err) {
    next(err);
  }
});

/* ─── Google OAuth (Authorization Code + PKCE) ─────────────────────────────── */

const G_STATE = "g_state";
const G_VERIFIER = "g_verifier";
const TEMP_COOKIE = {
  httpOnly: true,
  secure: env.cookie.secure,
  sameSite: env.cookie.sameSite,
  path: "/api/auth/google",
  maxAge: 10 * 60 * 1000,
} as const;

authRouter.get("/google", (_req, res, next) => {
  try {
    if (!googleEnabled) throw new ApiError(501, "Google sign-in is not configured");
    const state = randomState();
    const { verifier, challenge } = pkce();
    res.cookie(G_STATE, state, TEMP_COOKIE);
    res.cookie(G_VERIFIER, verifier, TEMP_COOKIE);
    res.redirect(buildAuthUrl(state, challenge));
  } catch (err) {
    next(err);
  }
});

authRouter.get("/google/callback", async (req, res, next) => {
  try {
    if (!googleEnabled) throw new ApiError(501, "Google sign-in is not configured");

    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : "";
    const cookieState = req.cookies?.[G_STATE] as string | undefined;
    const verifier = req.cookies?.[G_VERIFIER] as string | undefined;

    res.clearCookie(G_STATE, { path: "/api/auth/google" });
    res.clearCookie(G_VERIFIER, { path: "/api/auth/google" });

    if (!code || !state || !cookieState || state !== cookieState || !verifier) {
      throw new ApiError(400, "Invalid OAuth state");
    }

    const profile = await exchangeAndVerify(code, verifier);
    const user = await upsertGoogleUser(profile);

    await startSession(res, user.id, req.headers["user-agent"]);
    res.redirect(`${env.webOrigin}/lobby`);
  } catch (err) {
    // Send OAuth failures back to the login page rather than a JSON 500.
    if (err instanceof ApiError && err.status === 501) return next(err);
    console.error("[auth] google callback failed:", err);
    res.redirect(`${env.webOrigin}/login?error=google`);
  }
});

// Find-or-create the user behind a Google profile: match by googleId, else link
// an existing account by email, else create a new one with a unique username.
async function upsertGoogleUser(p: GoogleProfile): Promise<UserRow> {
  const email = p.email.toLowerCase();

  const existing = await db.query.users.findFirst({
    where: or(eq(users.googleId, p.googleId), eq(users.email, email)),
  });

  if (existing) {
    const [updated] = await db
      .update(users)
      .set({
        googleId: existing.googleId ?? p.googleId,
        avatarUrl: existing.avatarUrl ?? p.picture,
        emailVerified: existing.emailVerified || p.emailVerified,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existing.id))
      .returning();
    return updated;
  }

  const username = await uniqueUsername(email.split("@")[0]);
  const [created] = await db
    .insert(users)
    .values({
      username,
      email,
      googleId: p.googleId,
      avatarUrl: p.picture,
      emailVerified: p.emailVerified,
    })
    .returning();
  return created;
}

async function uniqueUsername(raw: string): Promise<string> {
  const base = (raw.toLowerCase().replace(/[^a-z0-9_]/g, "") || "user").slice(0, 24);
  let candidate = base.length >= 3 ? base : `${base}_${randomBytes(2).toString("hex")}`;
  for (let i = 0; i < 12; i++) {
    const taken = await db.query.users.findFirst({
      where: eq(users.username, candidate),
      columns: { id: true },
    });
    if (!taken) return candidate;
    candidate = `${base}_${randomBytes(3).toString("hex")}`;
  }
  return `${base}_${Date.now().toString(36)}`;
}
