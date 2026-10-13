import {
  ALPHA,
  BETA,
  COVERAGE_THRESHOLD,
  DELTA,
  GAMMA,
  URGENCY_HORIZON_DAYS,
} from "./constants";
import { fromHundredths, isPartial, toHundredths } from "./quantity";
import type {
  IsoDate,
  PantryEntry,
  RecipeEntry,
  ScoreResult,
  SimPantry,
} from "./types";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysBetween(from: IsoDate, to: IsoDate): number {
  return (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / MS_PER_DAY;
}

/** 1 when expiring today or already expired, falling to 0 over the horizon. */
export function urgency(expiresOn: IsoDate | null, today: IsoDate): number {
  if (expiresOn === null) return 0;
  const days = daysBetween(today, expiresOn);
  return Math.min(1, Math.max(0, 1 - days / URGENCY_HORIZON_DAYS));
}

export function simulatePantry(entries: PantryEntry[]): SimPantry {
  const sim: SimPantry = new Map();
  for (const { ingredientId, quantity, unit, isStaple, expiresOn } of entries) {
    sim.set(ingredientId, { qty: toHundredths(quantity), unit, isStaple, expiresOn });
  }
  return sim;
}

/** Scores `recipe` against the current simulated pantry (SPEC §5). Staples are ignored. */
export function score(recipe: RecipeEntry, pantry: SimPantry, today: IsoDate): ScoreResult {
  const needs = recipe.ingredients.filter((i) => !i.isStaple);

  let available = 0;
  let use = 0; // hundredths × weight
  let newPartial = 0;
  for (const ingredient of needs) {
    const item = pantry.get(ingredient.ingredientId);
    const have = item?.qty ?? 0;
    if (!item || have <= 0) continue;
    available += 1;

    const need = toHundredths(ingredient.quantity);
    const used = Math.min(need, have);
    const weight =
      1 + (isPartial(have) ? ALPHA : 0) + BETA * urgency(item.expiresOn, today);
    use += used * weight;

    if (!isPartial(have) && isPartial(have - used)) newPartial += 1;
  }

  const coverage = needs.length === 0 ? 0 : available / needs.length;
  // Integer comparison in whole percent: 3 of 5 is exactly at a 60% threshold, not below it.
  const thresholdPercent = Math.round(COVERAGE_THRESHOLD * 100);
  if (needs.length === 0 || available * 100 < thresholdPercent * needs.length) {
    return { kind: "skipped", coverage };
  }

  const missing = needs.length - available;
  const useUnits = fromHundredths(use);
  return {
    kind: "scored",
    score: useUnits - GAMMA * newPartial - DELTA * missing,
    coverage,
    use: useUnits,
    newPartial,
    missing,
  };
}
