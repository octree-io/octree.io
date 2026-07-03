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
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  judge0: {
    url: (process.env.JUDGE0_URL ?? "http://localhost:2358").replace(/\/+$/, ""),
    // Optional — only needed if the Judge0 instance has authn enabled.
    authToken: process.env.JUDGE0_AUTH_TOKEN,
  },
  worker: {
    // How many submissions a single worker process runs against Judge0 at once.
    concurrency: parseInt(process.env.WORKER_CONCURRENCY ?? "5", 10),
    // Result polling. Judge0's wall-time cap here is 10s, so ~30s of polling
    // headroom comfortably covers compile + run for the default limits.
    pollIntervalMs: parseInt(process.env.JUDGE0_POLL_INTERVAL_MS ?? "1000", 10),
    maxPollAttempts: parseInt(process.env.JUDGE0_MAX_POLL_ATTEMPTS ?? "30", 10),
  },
} as const;

export const isDev = env.nodeEnv === "development";
