import { describe, expect, it } from "vitest";
import { pantry, recipe } from "./fixtures";
import { planMeals } from "./plan";
import { suggestMeals } from "./suggest";

const TODAY = "2026-10-13";
const titles = (meals: { recipe: { title: string } }[]) => meals.map((m) => m.recipe.title);

describe("planMeals", () => {
  it("does not count the same onion for two meals", () => {
    const fridge = pantry({ onion: 1 });
    const recipes = [recipe("soup", { onion: 1 }), recipe("tart", { onion: 1 })];
    const result = planMeals(fridge, recipes, 2, { today: TODAY });
    expect(titles(result.meals)).toEqual(["soup"]);
  });

  it("plans the half onion left by the first meal into the second", () => {
    const fridge = pantry({ onion: 1.5, tomato: 1 });
    const recipes = [
      recipe("salsa", { onion: 1, tomato: 1 }),
      recipe("omelette", { onion: 0.5 }),
    ];
    const result = planMeals(fridge, recipes, 2, { today: TODAY });
    expect(titles(result.meals)).toEqual(["salsa", "omelette"]);
  });

  it("orders meals by the round they were picked in", () => {
    const fridge = pantry({ onion: 1, tomato: 1, leek: 1 });
    const recipes = [
      recipe("small", { leek: 1 }),
      recipe("big", { onion: 1, tomato: 1 }),
    ];
    const result = planMeals(fridge, recipes, 2, { today: TODAY });
    expect(titles(result.meals)).toEqual(["big", "small"]);
  });

  it("never picks a recipe below the coverage threshold", () => {
    const fridge = pantry({ onion: 1 });
    const recipes = [recipe("stew", { onion: 1, tomato: 1, leek: 1 })];
    const result = planMeals(fridge, recipes, 2, { today: TODAY });
    expect(result.meals).toEqual([]);
  });

  it("excludes recipes that don't match the dietary filter", () => {
    const fridge = pantry({ onion: 1, "chicken breast": 1 });
    const recipes = [
      recipe("chicken stir-fry", { onion: 1, "chicken breast": 1 }),
      recipe("onion soup", { onion: 1 }, { tags: ["vegetarian"] }),
    ];
    const result = planMeals(fridge, recipes, 2, { today: TODAY, dietary: "vegetarian" });
    expect(titles(result.meals)).toEqual(["onion soup"]);
  });

  it("returns fewer meals than asked when nothing else qualifies", () => {
    const fridge = pantry({ onion: 1 });
    const result = planMeals(fridge, [recipe("soup", { onion: 1 })], 5, { today: TODAY });
    expect(result.meals).toHaveLength(1);
  });

  it("breaks score ties by input order", () => {
    const fridge = pantry({ onion: 1, tomato: 1 });
    const recipes = [recipe("first", { tomato: 1 }), recipe("second", { onion: 1 })];
    const result = planMeals(fridge, recipes, 1, { today: TODAY });
    expect(titles(result.meals)).toEqual(["first"]);
  });

  it("counts hard-to-use leftovers before and after the plan", () => {
    const fridge = pantry({ onion: 0.5, parsley: 0.5, garlic: 0.5, salt: 0.5 });
    const result = planMeals(fridge, [recipe("soup", { onion: 0.5 })], 2, { today: TODAY });
    // garlic (clove) and salt (staple) never count as hard-to-use leftovers.
    expect(result.leftoversBefore).toBe(2);
    expect(result.leftoversAfter).toBe(1);
  });

  it("puts ingredients you don't have on the shopping list, summed across meals", () => {
    const fridge = pantry({ onion: 1, tomato: 1, leek: 1, parsley: 1 });
    const recipes = [
      recipe("soup", { onion: 1, leek: 1, carrot: 1 }),
      recipe("salad", { tomato: 1, parsley: 1, carrot: 0.5 }),
    ];
    const result = planMeals(fridge, recipes, 2, { today: TODAY });
    expect(result.shoppingList).toEqual([{ ingredientId: 4, quantity: 1.5 }]);
  });

  it("puts the shortfall of an ingredient you have too little of on the shopping list", () => {
    const fridge = pantry({ onion: 0.5 });
    const result = planMeals(fridge, [recipe("tart", { onion: 2 })], 1, { today: TODAY });
    expect(result.shoppingList).toEqual([{ ingredientId: 1, quantity: 1.5 }]);
  });

  it("leaves staples off the shopping list", () => {
    const fridge = pantry({ onion: 1 });
    const result = planMeals(fridge, [recipe("soup", { onion: 1, salt: 1 })], 1, { today: TODAY });
    expect(result.shoppingList).toEqual([]);
  });

  // Known greedy limitation, documented on purpose (SPEC §5): greedy takes the
  // single best recipe first and strands the carrot, while picking "onion &
  // carrot" + "tomato & leek" would use the whole pantry. Not "fixed".
  it("picks the locally best recipe even when another pair would use the whole pantry", () => {
    const fridge = pantry({ onion: 1, tomato: 1, leek: 1, carrot: 1 });
    const best = recipe("onion, tomato & leek", { onion: 1, tomato: 1, leek: 1 });
    const pairA = recipe("onion & carrot", { onion: 1, carrot: 1 });
    const pairB = recipe("tomato & leek", { tomato: 1, leek: 1 });

    const greedy = planMeals(fridge, [best, pairA, pairB], 2, { today: TODAY });
    const alternative = planMeals(fridge, [pairA, pairB], 2, { today: TODAY });

    expect(titles(greedy.meals)).toEqual(["onion, tomato & leek"]);
    expect(titles(alternative.meals)).toHaveLength(2);
  });
});

describe("suggestMeals", () => {
  it("ranks every qualifying recipe by score without simulated depletion", () => {
    const fridge = pantry({ onion: 0.5, tomato: 1 });
    const recipes = [
      recipe("salad", { tomato: 1 }),
      recipe("soup", { onion: 0.5 }),
      recipe("tart", { onion: 0.5, tomato: 1 }),
      recipe("stew", { leek: 1, carrot: 1 }),
    ];
    const ranked = suggestMeals(fridge, recipes, { today: TODAY });
    expect(titles(ranked)).toEqual(["tart", "soup", "salad"]);
  });

  it("applies the dietary filter", () => {
    const fridge = pantry({ onion: 1, "chicken breast": 1 });
    const recipes = [
      recipe("chicken stir-fry", { onion: 1, "chicken breast": 1 }),
      recipe("onion soup", { onion: 1 }, { tags: ["vegetarian"] }),
    ];
    const ranked = suggestMeals(fridge, recipes, { today: TODAY, dietary: "vegetarian" });
    expect(titles(ranked)).toEqual(["onion soup"]);
  });
});
