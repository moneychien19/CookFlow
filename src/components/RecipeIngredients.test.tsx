// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { RecipeDetail } from "@/lib/db/recipes";
import { RecipeIngredients } from "./RecipeIngredients";

type Line = RecipeDetail["ingredients"][number];
function row(id: number, sourceName: string, sourceMeasure: string, name: string, unit: Line["unit"], quantity: number): Line {
  return { ingredientId: id, sourceName, sourceMeasure, name, unit, quantity, isStaple: false };
}

const ingredients: Line[] = [
  row(1, "Chicken Breasts", "2 large", "chicken breast", "g", 400),
  row(2, "Onion", "1/2 cup", "onion", "whole", 1),
  row(3, "Coriander", "Handful", "cilantro", "bunch", 0.3),
  { ...row(4, "Salt", "To taste", "salt", "g", 1), isStaple: true },
];
const pantry = new Map([
  [1, 450],
  [2, 0.5],
]);

function render() {
  const host = document.createElement("div");
  host.innerHTML = renderToStaticMarkup(<RecipeIngredients ingredients={ingredients} pantry={pantry} />);
  return host;
}

const rows = () => [...render().querySelectorAll("li")].map((li) => li.textContent);

describe("RecipeIngredients", () => {
  it("shows each ingredient exactly as the source wrote it", () => {
    expect(rows()[0]).toContain("Chicken Breasts");
    expect(rows()[0]).toContain("2 large");
  });

  it("labels what the pantry covers, what it only partly covers, and what's missing, in text", () => {
    expect(rows().map((text) => text?.match(/Have some|Have|Missing|Staple/)?.[0])).toEqual([
      "Have",
      "Have some",
      "Missing",
      "Staple",
    ]);
  });

  it("sums up how many non-staple ingredients the cook has", () => {
    expect(render().querySelector("p")?.textContent).toBe("You have 2 of 3 ingredients (1 only partly).");
  });

  it("adds the stored amount after a measure the planner had to convert", () => {
    expect(rows()[1]).toContain("1/2 cup ≈ 1 × onion");
    expect(rows()[3]).not.toContain("≈");
  });
});
