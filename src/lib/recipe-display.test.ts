import { describe, expect, it } from "vitest";
import { conversionHint, ingredientStatus, instructionSteps } from "./recipe-display";

describe("instructionSteps", () => {
  it("splits numbered lines into steps, dropping only the numbers", () => {
    expect(instructionSteps("1. Chop the onion.\n2. Fry it until soft. Don't burn it!")).toEqual([
      "Chop the onion.",
      "Fry it until soft. Don't burn it!",
    ]);
  });

  it("keeps a single step", () => {
    expect(instructionSteps("1. Make and enjoy")).toEqual(["Make and enjoy"]);
  });

  it("gives up on text that isn't numbered 1, 2, 3, ... so nothing is lost or reordered", () => {
    expect(instructionSteps("Chop the onion.\nFry it.")).toBeNull();
    expect(instructionSteps("1. Chop.\n3. Fry.")).toBeNull();
    expect(instructionSteps("1. Chop.\n\n2. Fry.")).toBeNull();
  });
});

describe("ingredientStatus", () => {
  it("says you have it when the pantry covers the recipe's amount", () => {
    expect(ingredientStatus({ need: 2, have: 3, isStaple: false })).toBe("have");
    expect(ingredientStatus({ need: 1, have: 1 - 0.5 + 0.5, isStaple: false })).toBe("have");
  });

  it("says you have some when the pantry holds less than the recipe needs", () => {
    expect(ingredientStatus({ need: 2, have: 0.5, isStaple: false })).toBe("some");
  });

  it("says it's missing when it isn't in the pantry", () => {
    expect(ingredientStatus({ need: 2, have: undefined, isStaple: false })).toBe("missing");
  });

  it("treats staples as on hand, as the planner does", () => {
    expect(ingredientStatus({ need: 1, have: undefined, isStaple: true })).toBe("staple");
  });
});

describe("conversionHint", () => {
  const hint = (sourceMeasure: string, quantity: number, unit: Parameters<typeof conversionHint>[0]["unit"], name = "onion") =>
    conversionHint({ sourceMeasure, quantity, unit, name, isStaple: false });

  it("shows the stored amount in the ingredient's own unit", () => {
    expect(hint("1/2 cup", 0.5, "whole")).toBe("≈ 0.5 × onion");
    expect(hint("2 large", 400, "g", "chicken breast")).toBe("≈ 400 g");
    expect(hint("1 tsp", 1, "clove", "garlic")).toBe("≈ 1 clove");
    expect(hint("Handful", 0.3, "bunch", "cilantro")).toBe("≈ 0.3 bunch");
  });

  it("rounds weights and volumes of 10 or more to whole numbers", () => {
    expect(hint("1/2 lb", 226.8, "g", "beef")).toBe("≈ 227 g");
    expect(hint("1 tsp", 2.5, "g", "ginger")).toBe("≈ 2.5 g");
  });

  it("stays quiet when the source already says the same amount in the same unit", () => {
    expect(hint("500 g", 500, "g", "beef")).toBeNull();
    expect(hint("500g", 500, "g", "beef")).toBeNull();
    expect(hint("2", 2, "count", "egg")).toBeNull();
    expect(hint("1/2 ", 0.5, "count", "egg")).toBeNull();
    expect(hint("3 cloves", 3, "clove", "garlic")).toBeNull();
    expect(hint("1 chopped", 1, "whole")).toBeNull();
  });

  it("still explains a count the source measured in cups or spoons", () => {
    expect(hint("1 cup", 1, "whole")).toBe("≈ 1 × onion");
  });

  it("stays quiet for staples, whose amount is only a placeholder", () => {
    expect(conversionHint({ sourceMeasure: "pinch", quantity: 1, unit: "g", name: "salt", isStaple: true })).toBeNull();
  });
});
