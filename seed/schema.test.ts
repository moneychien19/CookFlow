import { describe, expect, it } from "vitest";
import { parseSeed } from "./schema";

const onion = { name: "onion", unit: "whole" };
const salt = { name: "salt", unit: "count", isStaple: true };
const soup = {
  source: "dev",
  sourceId: "dev-001",
  title: "Onion soup",
  imageUrl: null,
  instructions: "Slice the onion. Simmer for 30 minutes.",
  servings: 2,
  tags: ["vegetarian"],
  ingredients: [{ ingredient: "onion", quantity: 0.5, sourceName: "Onion", sourceMeasure: "1/2" }],
};

function parse(overrides: { ingredients?: unknown; recipes?: unknown; samplePantry?: unknown }) {
  return parseSeed({ ingredients: [onion, salt], recipes: [soup], samplePantry: [], ...overrides });
}

function errorOf(result: ReturnType<typeof parseSeed>): string {
  if (result.ok) throw new Error("expected the seed to be rejected");
  return result.error;
}

describe("parseSeed", () => {
  it("accepts valid seed data and defaults isStaple to false", () => {
    const result = parse({});
    expect(result.ok && result.data.ingredients[0]).toEqual({ name: "onion", unit: "whole", isStaple: false });
  });

  it("rejects an unknown unit, naming the file and field", () => {
    const error = errorOf(parse({ ingredients: [{ name: "flour", unit: "gram" }] }));
    expect(error).toContain("ingredients.json");
    expect(error).toContain("[0]");
    expect(error).toContain("unit");
  });

  it("rejects ingredient names that aren't lowercase and trimmed", () => {
    expect(errorOf(parse({ ingredients: [{ name: "Onion ", unit: "whole" }] }))).toContain("name");
  });

  it("rejects duplicate ingredient names", () => {
    expect(errorOf(parse({ ingredients: [onion, onion] }))).toContain('Duplicate ingredient "onion"');
  });

  it("rejects a recipe ingredient that isn't in ingredients.json", () => {
    const recipe = { ...soup, ingredients: [{ ...soup.ingredients[0], ingredient: "leek" }] };
    expect(errorOf(parse({ recipes: [recipe] }))).toContain('Onion soup uses unknown ingredient "leek"');
  });

  it("rejects a recipe listing the same ingredient twice", () => {
    const line = soup.ingredients[0];
    expect(errorOf(parse({ recipes: [{ ...soup, ingredients: [line, line] }] }))).toContain(
      'Onion soup lists "onion" twice',
    );
  });

  it.each([0, -1, 0.555, 10000])("rejects a recipe quantity of %s", (quantity) => {
    const recipe = { ...soup, ingredients: [{ ...soup.ingredients[0], quantity }] };
    expect(errorOf(parse({ recipes: [recipe] }))).toContain("quantity");
  });

  it("rejects empty instructions, which must be kept whole", () => {
    expect(errorOf(parse({ recipes: [{ ...soup, instructions: "" }] }))).toContain("instructions");
  });

  it("rejects duplicate recipe ids from the same source", () => {
    expect(errorOf(parse({ recipes: [soup, soup] }))).toContain('Duplicate recipe "dev/dev-001"');
  });

  it("rejects a sample pantry item that isn't a known ingredient", () => {
    const error = errorOf(parse({ samplePantry: [{ ingredient: "leek", quantity: 1, expiresInDays: null }] }));
    expect(error).toContain('Sample pantry uses unknown ingredient "leek"');
  });
});
