import type { Dietary, RecipeEntry } from "./types";

export function applyDietary(recipes: RecipeEntry[], dietary: Dietary | null | undefined) {
  return dietary ? recipes.filter((r) => r.tags.includes(dietary)) : recipes;
}
