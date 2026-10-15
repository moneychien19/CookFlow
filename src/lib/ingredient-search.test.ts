import { describe, expect, it } from "vitest";
import { normalizeIngredientName, searchIngredients } from "./ingredient-search";

const names = (list: { name: string }[]) => list.map((o) => o.name);
const options = ["bacon", "black beans", "chicken breast", "chicken thigh", "chickpeas", "dark beer", "egg"].map(
  (name) => ({ name }),
);

describe("normalizeIngredientName", () => {
  it("lowercases and collapses spaces, like the catalog's names", () => {
    expect(normalizeIngredientName("  Smoked   Tofu ")).toBe("smoked tofu");
  });
});

describe("searchIngredients", () => {
  it("finds nothing for an empty query", () => {
    expect(searchIngredients(options, "  ")).toEqual([]);
  });

  it("lists names starting with the query first, then words starting with it, then other matches", () => {
    expect(names(searchIngredients(options, "be"))).toEqual(["black beans", "dark beer"]);
    expect(names(searchIngredients(options, "chick"))).toEqual(["chicken breast", "chicken thigh", "chickpeas"]);
    expect(names(searchIngredients(options, "ea"))).toEqual(["black beans", "chicken breast", "chickpeas"]);
  });

  it("ignores case and extra spaces", () => {
    expect(names(searchIngredients(options, " Chicken  B"))).toEqual(["chicken breast"]);
  });

  it("returns at most the limit", () => {
    expect(searchIngredients(options, "c", 2)).toHaveLength(2);
  });
});
