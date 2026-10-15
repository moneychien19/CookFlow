import type { Unit } from "@/lib/planner/types";

export type SampleItem = {
  /** Canonical ingredient name, matched against `ingredients.name`. */
  name: string;
  /** The ingredient's canonical unit, repeated here so the list reads naturally and drift is caught. */
  unit: Unit;
  quantity: number;
  /** Only for `g`/`ml` items: a counted item is opened when `0 < quantity < 1` (SPEC §3). */
  opened: boolean;
  /** Days from the day it's loaded; null means no expiry date. */
  expiresInDays: number | null;
};

/**
 * "Load sample pantry": a realistic fridge picked from the recipe catalog.
 * It has 4 opened counted items, 4 opened weighed items, and chicken that
 * expires tomorrow, so the planner has opened and expiring food to use first.
 */
export const SAMPLE_PANTRY: readonly SampleItem[] = [
  { name: "chicken breast", unit: "g", quantity: 450, opened: false, expiresInDays: 1 },
  { name: "tomato", unit: "whole", quantity: 3, opened: false, expiresInDays: 2 },
  { name: "parsley", unit: "bunch", quantity: 0.5, opened: false, expiresInDays: 2 },
  { name: "bacon", unit: "g", quantity: 150, opened: true, expiresInDays: 3 },
  { name: "bell pepper", unit: "whole", quantity: 0.5, opened: false, expiresInDays: 3 },
  { name: "cilantro", unit: "bunch", quantity: 0.5, opened: false, expiresInDays: 3 },
  { name: "milk", unit: "ml", quantity: 500, opened: true, expiresInDays: 4 },
  { name: "eggplant", unit: "whole", quantity: 1, opened: false, expiresInDays: 4 },
  { name: "egg", unit: "count", quantity: 6, opened: false, expiresInDays: 10 },
  { name: "chorizo", unit: "g", quantity: 120, opened: true, expiresInDays: null },
  { name: "cheddar", unit: "g", quantity: 150, opened: true, expiresInDays: null },
  { name: "butter", unit: "g", quantity: 200, opened: false, expiresInDays: null },
  { name: "onion", unit: "whole", quantity: 1.5, opened: false, expiresInDays: null },
  { name: "lemon", unit: "whole", quantity: 0.5, opened: false, expiresInDays: null },
  { name: "potato", unit: "whole", quantity: 5, opened: false, expiresInDays: null },
  { name: "garlic", unit: "clove", quantity: 8, opened: false, expiresInDays: null },
  { name: "chili pepper", unit: "whole", quantity: 2, opened: false, expiresInDays: null },
];
