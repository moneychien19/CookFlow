import type { IsoDate, PantryEntry, RecipeEntry } from "@/lib/planner/types";
import type { SeedData } from "./schema";

function addDays(date: IsoDate, days: number): IsoDate {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Seed data as planner input, without a database: ingredient ids are positions
 * in ingredients.json. Lets tests check the sample pantry and recipes plan well.
 */
export function toPlannerInput(seed: SeedData, today: IsoDate): { pantry: PantryEntry[]; recipes: RecipeEntry[] } {
  const byName = new Map(seed.ingredients.map((ingredient, index) => [ingredient.name, { ...ingredient, id: index + 1 }]));
  const lookup = (name: string) => {
    const ingredient = byName.get(name);
    if (!ingredient) throw new Error(`Unknown ingredient ${name}; run parseSeed first`);
    return ingredient;
  };
  return {
    pantry: seed.samplePantry.map((item) => {
      const { id, unit, isStaple } = lookup(item.ingredient);
      const expiresOn = item.expiresInDays === null ? null : addDays(today, item.expiresInDays);
      return { ingredientId: id, quantity: item.quantity, unit, isStaple, expiresOn };
    }),
    recipes: seed.recipes.map((recipe, index) => ({
      id: index + 1,
      title: recipe.title,
      tags: recipe.tags,
      ingredients: recipe.ingredients.map((line) => {
        const { id, isStaple } = lookup(line.ingredient);
        return { ingredientId: id, quantity: line.quantity, isStaple };
      }),
    })),
  };
}
