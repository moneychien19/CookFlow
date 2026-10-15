// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IngredientOption } from "@/lib/db/pantry";
import { AddPantryItemForm } from "./PantryItemForm";

// The real actions pull in Auth.js; these tests only drive the form in the browser.
vi.mock("@/app/pantry/actions", () => ({ addItem: vi.fn(), editItem: vi.fn(), deleteItem: vi.fn() }));

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const OPTIONS: IngredientOption[] = [
  { id: 1, name: "chicken breast", unit: "g", custom: false },
  { id: 2, name: "chicken thigh", unit: "g", custom: false },
  { id: 3, name: "chickpeas", unit: "g", custom: false },
  { id: 4, name: "onion", unit: "whole", custom: false },
  { id: 5, name: "smoked tofu", unit: "g", custom: true },
];

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root.render(<AddPantryItemForm options={OPTIONS} />));
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const combobox = () => host.querySelector<HTMLInputElement>('[role="combobox"]')!;
const optionTexts = () => [...host.querySelectorAll('[role="option"]')].map((o) => o.textContent);
const hidden = (name: string) => host.querySelector<HTMLInputElement>(`input[type="hidden"][name="${name}"]`)?.value;

function type(text: string) {
  const input = combobox();
  act(() => {
    input.focus();
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, text);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function press(key: string) {
  act(() => {
    combobox().dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
  });
}

describe("AddPantryItemForm ingredient combobox", () => {
  it("suggests matching ingredients as the cook types", () => {
    type("chick");
    expect(combobox().getAttribute("aria-expanded")).toBe("true");
    expect(optionTexts()).toEqual([
      expect.stringContaining("chicken breast"),
      expect.stringContaining("chicken thigh"),
      expect.stringContaining("chickpeas"),
      'Add "chick" as a new ingredient',
    ]);
  });

  it("picks a suggestion with the arrow keys and Enter, and shows its unit", () => {
    type("chick");
    press("ArrowDown");
    press("ArrowDown");
    press("Enter");
    expect(combobox().value).toBe("chicken thigh");
    expect(hidden("ingredientId")).toBe("2");
    expect(combobox().getAttribute("aria-expanded")).toBe("false");
    expect(host.textContent).toContain("in grams");
  });

  it("points aria-activedescendant at the highlighted suggestion", () => {
    type("chick");
    press("ArrowDown");
    const active = combobox().getAttribute("aria-activedescendant") ?? "";
    expect(host.querySelector(`#${CSS.escape(active)}`)?.getAttribute("aria-selected")).toBe("true");
  });

  it("takes an exact name as picked, without choosing from the list", () => {
    type("Onion");
    expect(hidden("ingredientId")).toBe("4");
    expect(host.querySelector('select[name="newUnit"]')).toBeNull();
  });

  it("marks the cook's own ingredients in the suggestions", () => {
    type("tofu");
    expect(optionTexts()[0]).toContain("yours");
  });

  it("asks for a unit when the name isn't in the list", () => {
    type("Dragon fruit");
    expect(optionTexts()).toEqual(['Add "dragon fruit" as a new ingredient']);
    expect(hidden("ingredientId")).toBe("");
    expect(hidden("newName")).toBe("Dragon fruit");
    expect(host.querySelector('select[name="newUnit"]')).not.toBeNull();
  });

  it("closes the suggestions on Escape", () => {
    type("chick");
    press("Escape");
    expect(combobox().getAttribute("aria-expanded")).toBe("false");
    expect(host.querySelector('[role="listbox"]')).toBeNull();
  });
});
