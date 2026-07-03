import { Redis } from "ioredis";
import { env } from "../config.js";

// BullMQ requires `maxRetriesPerRequest: null` on the shared ioredis connection
// so blocking commands (used by workers) aren't aborted mid-flight.
export const connection = new Redis(env.redisUrl, {
  maxRetriesPerRequest: null,
});

connection.on("error", (err) => {
  console.error("[redis] connection error:", err.message);
});
