import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb, type Db } from "@/lib/db/client";
import { recipeIngredients, recipes } from "@/lib/db/schema";
import { readSeedFiles } from "./read";
import { parseSeed } from "./schema";
import { seedDatabase } from "./seed";

// Runs against a real Postgres (a Neon dev branch), only when TEST_DATABASE_URL is set.
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("seedDatabase (real Postgres)", () => {
  // Connect in beforeAll, not here: the describe body still runs when the suite is skipped.
  let db: Db;
  beforeAll(() => {
    db = createDb(url ?? "");
  });
  afterAll(() => db.$client.end());

  const parsed = parseSeed(readSeedFiles());
  if (!parsed.ok) throw new Error(parsed.error);
  const seed = parsed.data;

  it("leaves the same row counts when run twice", async () => {
    const first = await seedDatabase(db, seed);
    const second = await seedDatabase(db, seed);
    expect(second).toEqual(first);
    expect(first.ingredients).toBeGreaterThanOrEqual(seed.ingredients.length);
  });

  it("stores each recipe's ingredients with the source's exact text", async () => {
    await seedDatabase(db, seed);
    const expected = seed.recipes[0]!;
    const [recipe] = await db.select().from(recipes).where(eq(recipes.sourceId, expected.sourceId));
    const lines = await db.select().from(recipeIngredients).where(eq(recipeIngredients.recipeId, recipe!.id));
    expect(recipe!.instructions).toBe(expected.instructions);
    expect(lines.map((l) => [l.sourceName, l.sourceMeasure, l.quantity]).sort()).toEqual(
      expected.ingredients.map((l) => [l.sourceName, l.sourceMeasure, l.quantity]).sort(),
    );
  });
});
