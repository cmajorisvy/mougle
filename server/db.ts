import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`[db] Missing required environment variable: ${name}`);
  }
  return value;
}

const databaseUrl = requireEnv("DATABASE_URL");

export const pool = new Pool({
  connectionString: databaseUrl,
});

export const db = drizzle(pool, { schema });
