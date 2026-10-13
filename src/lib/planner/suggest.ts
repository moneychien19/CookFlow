import { SCORE_EPSILON } from "./constants";
import { applyDietary } from "./filter";
import { score, simulatePantry } from "./score";
import type { PantryEntry, PlannerOptions, RecipeEntry, ScoreResult } from "./types";

export type Suggestion = {
  recipe: RecipeEntry;
  result: Extract<ScoreResult, { kind: "scored" }>;
};

/** Single-meal suggestions: the planner's scoring run once, best first (stable on ties). */
export function suggestMeals(
  pantry: PantryEntry[],
  recipes: RecipeEntry[],
  options: PlannerOptions,
): Suggestion[] {
  const sim = simulatePantry(pantry);
  const suggestions: Suggestion[] = [];
  for (const recipe of applyDietary(recipes, options.dietary)) {
    const result = score(recipe, sim, options.today);
    if (result.kind === "scored") suggestions.push({ recipe, result });
  }
  return suggestions.sort((a, b) => {
    const diff = b.result.score - a.result.score;
    return Math.abs(diff) < SCORE_EPSILON ? 0 : diff;
  });
}
