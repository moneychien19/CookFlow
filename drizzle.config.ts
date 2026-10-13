import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// Same env files as Next.js (.env.local, ...). `generate` doesn't need DATABASE_URL;
// `migrate` and `studio` fail with a connection error without it.
loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  strict: true,
});
