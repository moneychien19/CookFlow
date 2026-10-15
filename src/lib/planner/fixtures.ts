import type { PantryEntry, RecipeEntry, Unit } from "./types";

// Test-only catalog: name → ingredient metadata, so fixtures read like a fridge.
const CATALOG: Record<string, { id: number; unit: Unit; isStaple?: boolean }> = {
  onion: { id: 1, unit: "whole" },
  tomato: { id: 2, unit: "whole" },
  leek: { id: 3, unit: "whole" },
  carrot: { id: 4, unit: "whole" },
  "chicken breast": { id: 5, unit: "pack" },
  parsley: { id: 6, unit: "bunch" },
  garlic: { id: 7, unit: "clove" },
  egg: { id: 8, unit: "count" },
  mushrooms: { id: 9, unit: "pack" },
  rice: { id: 10, unit: "pack" },
  bacon: { id: 11, unit: "g" },
  milk: { id: 12, unit: "ml" },
  salt: { id: 100, unit: "count", isStaple: true },
  pepper: { id: 101, unit: "count", isStaple: true },
};

function lookup(name: string) {
  const entry = CATALOG[name];
  if (!entry) throw new Error(`Unknown fixture ingredient: ${name}`);
  return entry;
}

type PantrySpec = Record<string, number | { qty: number; expiresOn?: string; opened?: boolean }>;

export function pantry(spec: PantrySpec): PantryEntry[] {
  return Object.entries(spec).map(([name, value]) => {
    const { id, unit, isStaple = false } = lookup(name);
    const { qty, expiresOn = null, opened = false } =
      typeof value === "number" ? { qty: value } : value;
    return { ingredientId: id, quantity: qty, unit, isStaple, expiresOn, opened };
  });
}

let nextRecipeId = 1;

export function recipe(
  title: string,
  needs: Record<string, number>,
  options: { tags?: string[] } = {},
): RecipeEntry {
  return {
    id: nextRecipeId++,
    title,
    tags: options.tags ?? [],
    ingredients: Object.entries(needs).map(([name, quantity]) => {
      const { id, isStaple = false } = lookup(name);
      return { ingredientId: id, quantity, isStaple };
    }),
  };
}
