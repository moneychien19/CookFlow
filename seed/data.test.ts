import { describe, expect, it } from "vitest";
import { planMeals } from "@/lib/planner";
import { toPlannerInput } from "./planner-input";
import { readSeedFiles } from "./read";
import { parseSeed } from "./schema";

const result = parseSeed(readSeedFiles());
const seed = (() => {
  if (!result.ok) throw new Error(result.error);
  return result.data;
})();

describe("committed seed data", () => {
  it("passes validation", () => {
    expect(result.ok).toBe(true);
  });

  it.each(["salt", "black pepper", "olive oil", "vegetable oil", "water", "sugar"])(
    "flags %s as a staple",
    (name) => {
      expect(seed.ingredients.find((i) => i.name === name)?.isStaple).toBe(true);
    },
  );

  it("has enough recipes, including vegetarian ones", () => {
    expect(seed.recipes.length).toBeGreaterThanOrEqual(10);
    expect(seed.recipes.filter((r) => r.tags.includes("vegetarian")).length).toBeGreaterThanOrEqual(4);
  });

  it("has recipes that use part of an item, so partial leftovers can be planned around", () => {
    const partialLines = seed.recipes.flatMap((r) => r.ingredients).filter((l) => l.quantity < 1);
    expect(partialLines.length).toBeGreaterThanOrEqual(5);
  });

  it("gives the sample pantry opened and expiring items to plan around", () => {
    expect(seed.samplePantry.some((i) => i.quantity < 1)).toBe(true);
    expect(seed.samplePantry.some((i) => i.expiresInDays !== null && i.expiresInDays <= 3)).toBe(true);
  });

  it("turns the sample pantry into a 3-meal plan that leaves fewer opened items", () => {
    const { pantry, recipes } = toPlannerInput(seed, "2026-10-13");
    const plan = planMeals(pantry, recipes, 3, { today: "2026-10-13" });
    expect(plan.meals).toHaveLength(3);
    expect(plan.leftoversAfter).toBeLessThan(plan.leftoversBefore);
  });

  it("can plan 3 vegetarian meals from the sample pantry", () => {
    const { pantry, recipes } = toPlannerInput(seed, "2026-10-13");
    const plan = planMeals(pantry, recipes, 3, { today: "2026-10-13", dietary: "vegetarian" });
    expect(plan.meals).toHaveLength(3);
  });
});
