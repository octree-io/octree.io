import { config } from "dotenv";

config();

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

const nodeEnv = process.env.NODE_ENV ?? "development";
const isProd = nodeEnv === "production";

// Browser origin allowed to make credentialed requests (CORS + Socket.IO).
// Cookies require an explicit origin (not "*"), so this drives both.
const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:5173";

export const env = {
  port: parseInt(process.env.PORT ?? "3001", 10),
  nodeEnv,
  databaseUrl: required("DATABASE_URL"),
  // Redis backs the BullMQ submission queue the API enqueues to. The worker
  // (separate @octree/worker package) consumes it and talks to Judge0.
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  // The single browser origin permitted for credentialed CORS + Socket.IO.
  webOrigin,
  // How long each problem round lasts before the socket server rotates the
  // room to the next problem. Falls back to the room's own durationMinutes
  // when this is unset; kept small-configurable so the switch is observable.
  roundSeconds: process.env.ROUND_SECONDS
    ? parseInt(process.env.ROUND_SECONDS, 10)
    : null,
  // Session cookie settings. Secure in production; SameSite=Lax works for the
  // same-site web↔api split in dev and typical prod subdomains.
  cookie: {
    secure: process.env.COOKIE_SECURE
      ? process.env.COOKIE_SECURE === "true"
      : isProd,
    sameSite: (process.env.COOKIE_SAMESITE ?? "lax") as "lax" | "strict" | "none",
  },
  sessionTtlDays: parseInt(process.env.SESSION_TTL_DAYS ?? "30", 10),
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    redirectUri:
      process.env.GOOGLE_REDIRECT_URI ??
      `http://localhost:${process.env.PORT ?? "3001"}/api/auth/google/callback`,
  },
} as const;

export const isDev = env.nodeEnv === "development";

// Whether Google OAuth is configured; the /google routes 501 without it.
export const googleEnabled = Boolean(env.google.clientId && env.google.clientSecret);
