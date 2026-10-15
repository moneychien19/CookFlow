import { describe, expect, it } from "vitest";
import { ingredientStatus, instructionSteps } from "./recipe-display";

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
