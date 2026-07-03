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
} as const;

export const isDev = env.nodeEnv === "development";
