import { describe, expect, it } from "vitest";
import { planMeals } from "./plan";
import type { PantryEntry, RecipeEntry } from "./types";

// Deterministic synthetic data: 40 ingredients, 100 recipes of 8 ingredients each.
function syntheticPantry(): PantryEntry[] {
  return Array.from({ length: 25 }, (_, i) => ({
    ingredientId: i + 1,
    quantity: (i % 4) * 0.5 + 0.5,
    unit: "whole",
    isStaple: false,
    expiresOn: i % 3 === 0 ? "2026-10-15" : null,
    opened: false,
  }));
}

function syntheticRecipes(): RecipeEntry[] {
  return Array.from({ length: 100 }, (_, r) => ({
    id: r + 1,
    title: `recipe ${r + 1}`,
    tags: r % 2 === 0 ? ["vegetarian"] : [],
    ingredients: Array.from({ length: 8 }, (_, k) => ({
      ingredientId: ((r * 7 + k * 5) % 40) + 1,
      quantity: (k % 3) * 0.5 + 0.5,
      isStaple: false,
    })),
  }));
}

describe("planner benchmark", () => {
  it("plans 5 meals over 100 recipes in under 500 ms", () => {
    const fridge = syntheticPantry();
    const recipes = syntheticRecipes();
    const start = performance.now();
    const result = planMeals(fridge, recipes, 5, { today: "2026-10-13" });
    expect(performance.now() - start).toBeLessThan(500);
    expect(result.meals).toHaveLength(5);
  });
});
