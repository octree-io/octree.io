import { config } from "dotenv";

config();

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

export const env = {
  port: parseInt(process.env.PORT ?? "3001", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: required("DATABASE_URL"),
  // Redis backs the BullMQ submission queue the API enqueues to. The worker
  // (separate @octree/worker package) consumes it and talks to Judge0.
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  // Allowed browser origin for CORS + Socket.IO. "*" in dev.
  corsOrigin: process.env.CORS_ORIGIN ?? "*",
  // How long each problem round lasts before the socket server rotates the
  // room to the next problem. Falls back to the room's own durationMinutes
  // when this is unset; kept small-configurable so the switch is observable.
  roundSeconds: process.env.ROUND_SECONDS
    ? parseInt(process.env.ROUND_SECONDS, 10)
    : null,
} as const;

export const isDev = env.nodeEnv === "development";
