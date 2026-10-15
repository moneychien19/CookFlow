// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { RecipeDetail } from "@/lib/db/recipes";
import { RecipeIngredients } from "./RecipeIngredients";

const ingredients: RecipeDetail["ingredients"] = [
  { ingredientId: 1, sourceName: "Chicken Breasts", sourceMeasure: "2 large", quantity: 400, isStaple: false },
  { ingredientId: 2, sourceName: "Onion", sourceMeasure: "1 chopped", quantity: 1, isStaple: false },
  { ingredientId: 3, sourceName: "Coriander", sourceMeasure: "Handful", quantity: 0.3, isStaple: false },
  { ingredientId: 4, sourceName: "Salt", sourceMeasure: "To taste", quantity: 1, isStaple: true },
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
});
