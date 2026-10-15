import { SCORE_EPSILON } from "./constants";
import { applyDietary } from "./filter";
import { fromHundredths, toHundredths } from "./quantity";
import { afterUse, isSimOpened, score, simulatePantry } from "./score";
import type { PantryEntry, PlannerOptions, RecipeEntry, SimPantry } from "./types";

export type PlannedMeal = { recipe: RecipeEntry; score: number };

export type PlanResult = {
  meals: PlannedMeal[];
  /** Count of hard-to-use leftovers (SPEC §3) before and after the plan. */
  leftoversBefore: number;
  leftoversAfter: number;
  /** What to buy, in each ingredient's canonical unit, sorted by ingredient id. */
  shoppingList: { ingredientId: number; quantity: number }[];
};

/** Hard-to-use leftovers (SPEC §3): non-staple opened items. */
export function countHardToUse(pantry: SimPantry): number {
  let count = 0;
  for (const item of pantry.values()) {
    if (!item.isStaple && isSimOpened(item)) count += 1;
  }
  return count;
}

/** Simulates cooking `recipe`: deducts non-staples and records any shortfall to buy. */
function cook(pantry: SimPantry, recipe: RecipeEntry, shortfall: Map<number, number>) {
  for (const { ingredientId, quantity, isStaple } of recipe.ingredients) {
    if (isStaple) continue;
    const need = toHundredths(quantity);
    const item = pantry.get(ingredientId);
    const have = item?.qty ?? 0;
    if (need > have) {
      shortfall.set(ingredientId, (shortfall.get(ingredientId) ?? 0) + need - have);
    }
    if (!item) continue;
    if (have <= need) pantry.delete(ingredientId);
    else pantry.set(ingredientId, afterUse(item, need));
  }
}

/** Greedy multi-meal planner with simulated depletion (SPEC §5). */
export function planMeals(
  pantry: PantryEntry[],
  recipes: RecipeEntry[],
  n: number,
  options: PlannerOptions,
): PlanResult {
  const sim = simulatePantry(pantry);
  const leftoversBefore = countHardToUse(sim);
  // A copy: picked recipes are removed from it, and the caller's list must stay intact.
  const remaining = [...applyDietary(recipes, options.dietary)];
  const meals: PlannedMeal[] = [];
  const shortfall = new Map<number, number>();

  while (meals.length < n) {
    let bestIndex = -1;
    let bestScore = -Infinity;
    remaining.forEach((candidate, index) => {
      const result = score(candidate, sim, options.today);
      if (result.kind === "scored" && result.score > bestScore + SCORE_EPSILON) {
        bestIndex = index;
        bestScore = result.score;
      }
    });
    const best = remaining[bestIndex];
    if (!best) break;

    meals.push({ recipe: best, score: bestScore });
    cook(sim, best, shortfall);
    remaining.splice(bestIndex, 1);
  }

  return {
    meals,
    leftoversBefore,
    leftoversAfter: countHardToUse(sim),
    shoppingList: [...shortfall.entries()]
      .sort(([a], [b]) => a - b)
      .map(([ingredientId, qty]) => ({ ingredientId, quantity: fromHundredths(qty) })),
  };
}
