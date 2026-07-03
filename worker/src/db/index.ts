import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../config.js";
import * as schema from "./schema.js";

const client = postgres(env.databaseUrl);

export const db = drizzle(client, { schema });

export type DB = typeof db;
