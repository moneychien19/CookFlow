export type Unit = "whole" | "pack" | "bunch" | "clove" | "count";

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
