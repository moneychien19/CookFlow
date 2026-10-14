import { count, inArray, sql } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { ingredients, recipeIngredients, recipes, users } from "@/lib/db/schema";
import { DEMO_USER_ID } from "@/lib/demo";
import type { SeedData } from "./schema";

export type SeedCounts = { ingredients: number; recipes: number; recipeIngredients: number };

/**
 * Upserts validated seed data in one transaction. Idempotent: ingredients match
 * on name, recipes on (source, source_id), and each seeded recipe's ingredient
 * lines are replaced. Rows not in the seed files are left alone. Also creates
 * the shared demo user, which has no email or image.
 */
export async function seedDatabase(db: Db, seed: SeedData): Promise<SeedCounts> {
  return db.transaction(async (tx) => {
    await tx.insert(users).values({ id: DEMO_USER_ID, name: "Demo" }).onConflictDoNothing();
    await tx
      .insert(ingredients)
      .values(seed.ingredients)
      .onConflictDoUpdate({
        target: ingredients.name,
        set: { unit: sql`excluded.unit`, isStaple: sql`excluded.is_staple` },
      });
    const idByName = new Map(
      (await tx.select({ id: ingredients.id, name: ingredients.name }).from(ingredients)).map((i) => [i.name, i.id]),
    );

    const saved = await tx
      .insert(recipes)
      .values(
        seed.recipes.map((r) => ({
          source: r.source,
          sourceId: r.sourceId,
          title: r.title,
          imageUrl: r.imageUrl,
          instructions: r.instructions,
          servings: r.servings,
          tags: r.tags,
        })),
      )
      .onConflictDoUpdate({
        target: [recipes.source, recipes.sourceId],
        set: {
          title: sql`excluded.title`,
          imageUrl: sql`excluded.image_url`,
          instructions: sql`excluded.instructions`,
          servings: sql`excluded.servings`,
          tags: sql`excluded.tags`,
        },
      })
      .returning({ id: recipes.id, source: recipes.source, sourceId: recipes.sourceId });
    const recipeId = new Map(saved.map((r) => [`${r.source}/${r.sourceId}`, r.id]));

    await tx.delete(recipeIngredients).where(inArray(recipeIngredients.recipeId, [...recipeId.values()]));
    await tx.insert(recipeIngredients).values(
      seed.recipes.flatMap((recipe) =>
        recipe.ingredients.map((line) => ({
          recipeId: lookup(recipeId, `${recipe.source}/${recipe.sourceId}`),
          ingredientId: lookup(idByName, line.ingredient),
          quantity: line.quantity,
          sourceName: line.sourceName,
          sourceMeasure: line.sourceMeasure,
        })),
      ),
    );

    const [[i], [r], [l]] = await Promise.all([
      tx.select({ n: count() }).from(ingredients),
      tx.select({ n: count() }).from(recipes),
      tx.select({ n: count() }).from(recipeIngredients),
    ]);
    return { ingredients: i?.n ?? 0, recipes: r?.n ?? 0, recipeIngredients: l?.n ?? 0 };
  });
}

function lookup<K, V>(map: Map<K, V>, key: K): V {
  const value = map.get(key);
  // parseSeed checks every reference, so a miss here is a programmer error.
  if (value === undefined) throw new Error(`Seed reference not found: ${String(key)}`);
  return value;
}
