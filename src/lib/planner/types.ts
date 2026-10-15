/**
 * Canonical units (SPEC §3). One per ingredient; no conversion at runtime.
 * Produce is counted ("whole", "bunch"); meat, fish, cheese, and dry goods are
 * weighed in grams; milk and cream are measured in millilitres.
 */
export const UNITS = ["whole", "pack", "bunch", "clove", "count", "g", "ml"] as const;
export type Unit = (typeof UNITS)[number];

/** ISO calendar date, "YYYY-MM-DD". */
export type IsoDate = string;

export type PantryEntry = {
  ingredientId: number;
  quantity: number;
  unit: Unit;
  isStaple: boolean;
  expiresOn: IsoDate | null;
  /** The `pantry_items.opened` flag; see `isOpened` for the full SPEC §3 rule. */
  opened: boolean;
};

export type RecipeIngredient = {
  ingredientId: number;
  quantity: number;
  isStaple: boolean;
};

export type RecipeEntry = {
  id: number;
  title: string;
  tags: string[];
  ingredients: RecipeIngredient[];
};

/** One pantry item during planning. `qty` is in integer hundredths. */
export type SimItem = {
  qty: number;
  unit: Unit;
  isStaple: boolean;
  expiresOn: IsoDate | null;
  opened: boolean;
};

/** Pantry state during planning, by ingredient id. */
export type SimPantry = Map<number, SimItem>;

export type ScoreResult =
  | { kind: "skipped"; coverage: number }
  | {
      kind: "scored";
      score: number;
      coverage: number;
      use: number;
      newPartial: number;
      missing: number;
    };

export type Dietary = "vegetarian";

export type PlannerOptions = {
  /** "Today" as an ISO date; passed in so the planner stays deterministic. */
  today: IsoDate;
  dietary?: Dietary | null;
};
