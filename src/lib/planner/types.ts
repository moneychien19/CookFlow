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

/** Pantry state during planning. Quantities are integer hundredths. */
export type SimPantry = Map<
  number,
  { qty: number; unit: Unit; isStaple: boolean; expiresOn: IsoDate | null }
>;

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
