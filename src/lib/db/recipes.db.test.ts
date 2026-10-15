import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb, type Db } from "./client";
import { getRecipe } from "./recipes";
import { recipeIngredients, recipes } from "./schema";

// Runs against a real Postgres with the recipe catalog loaded, only when TEST_DATABASE_URL is set.
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("getRecipe (real Postgres)", () => {
  // Connect in beforeAll, not here: the describe body still runs when the suite is skipped.
  let db: Db;
  beforeAll(() => {
    db = createDb(url ?? "");
  });
  afterAll(() => db.$client.end());

  it("returns the recipe with every ingredient as the source wrote it, non-staples first", async () => {
    const [any] = await db.select({ id: recipes.id }).from(recipes).limit(1);
    const recipe = await getRecipe(db, any?.id ?? 0);
    const rows = await db.select().from(recipeIngredients).where(eq(recipeIngredients.recipeId, any?.id ?? 0));

    expect(recipe?.ingredients).toHaveLength(rows.length);
    expect(recipe?.ingredients[0]).toEqual({
      ingredientId: expect.any(Number),
      sourceName: expect.any(String),
      sourceMeasure: expect.any(String),
      name: expect.any(String),
      unit: expect.any(String),
      quantity: expect.any(Number),
      isStaple: false,
    });
    const staples = recipe?.ingredients.map((i) => i.isStaple) ?? [];
    expect(staples).toEqual([...staples].sort((a, b) => Number(a) - Number(b)));
  });

  it("returns null for an id that doesn't exist", async () => {
    expect(await getRecipe(db, 999999999)).toBeNull();
  });
});
