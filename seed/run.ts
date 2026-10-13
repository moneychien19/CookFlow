// `npm run db:seed`: validate seed/*.json and upsert into DATABASE_URL.
import { loadEnvConfig } from "@next/env";
import { createDb } from "@/lib/db/client";
import { readSeedFiles } from "./read";
import { parseSeed } from "./schema";
import { seedDatabase } from "./seed";

async function main() {
  loadEnvConfig(process.cwd());
  const result = parseSeed(readSeedFiles());
  if (!result.ok) {
    console.error(`Seed data is invalid; nothing was written.\n\n${result.error}`);
    process.exitCode = 1;
    return;
  }
  const db = createDb(process.env.DATABASE_URL ?? "");
  try {
    const counts = await seedDatabase(db, result.data);
    console.log(
      `Seeded: ${counts.ingredients} ingredients, ${counts.recipes} recipes, ${counts.recipeIngredients} recipe ingredients.`,
    );
  } finally {
    await db.$client.end();
  }
}

void main();
