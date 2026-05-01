import { defineConfig } from "drizzle-kit";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`[drizzle] Missing required environment variable: ${name}`);
  }
  return value;
}

const databaseUrl = requireEnv("DATABASE_URL");

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
