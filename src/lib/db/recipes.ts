import { asc, eq } from "drizzle-orm";
import type { Db } from "./client";
import { ingredients, recipeIngredients, recipes } from "./schema";

export type RecipeDetail = {
  id: number;
  title: string;
  /** "themealdb" */
  source: string;
  sourceId: string;
  imageUrl: string | null;
  instructions: string;
  tags: string[];
  ingredients: {
    ingredientId: number;
    /** Exactly as the source wrote them (SPEC §7a #9). */
    sourceName: string;
    sourceMeasure: string;
    /** Canonical amount, only for comparing against the pantry. */
    quantity: number;
    isStaple: boolean;
  }[];
};

/**
 * One recipe with its ingredients, or null. Ingredients come non-staples first,
 * then by name: the source's own order isn't stored (see tasks/plan.md, T14).
 */
export async function getRecipe(db: Db, id: number): Promise<RecipeDetail | null> {
  const [recipe] = await db
    .select({
      id: recipes.id,
      title: recipes.title,
      source: recipes.source,
      sourceId: recipes.sourceId,
      imageUrl: recipes.imageUrl,
      instructions: recipes.instructions,
      tags: recipes.tags,
    })
    .from(recipes)
    .where(eq(recipes.id, id));
  if (!recipe) return null;

  const rows = await db
    .select({
      ingredientId: recipeIngredients.ingredientId,
      sourceName: recipeIngredients.sourceName,
      sourceMeasure: recipeIngredients.sourceMeasure,
      quantity: recipeIngredients.quantity,
      isStaple: ingredients.isStaple,
    })
    .from(recipeIngredients)
    .innerJoin(ingredients, eq(ingredients.id, recipeIngredients.ingredientId))
    .where(eq(recipeIngredients.recipeId, id))
    .orderBy(asc(ingredients.isStaple), asc(recipeIngredients.sourceName));
  return { ...recipe, ingredients: rows };
}
