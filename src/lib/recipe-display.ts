import { formatQuantity } from "@/lib/pantry-display";
import type { Unit } from "@/lib/planner";
import { toHundredths } from "@/lib/planner/quantity";

/**
 * The recipe's steps, from instructions stored as "1. …\n2. …" (SPEC §4), with
 * only the numbers removed so an <ol> can number them. Returns null unless the
 * lines are numbered exactly 1, 2, 3, ...; the page then shows the text as is,
 * so no word is ever dropped (SPEC §7a #10).
 */
export function instructionSteps(instructions: string): string[] | null {
  const lines = instructions.split("\n");
  const steps: string[] = [];
  for (const [index, line] of lines.entries()) {
    const prefix = `${index + 1}. `;
    if (!line.startsWith(prefix) || line.length === prefix.length) return null;
    steps.push(line.slice(prefix.length));
  }
  return steps;
}

export type IngredientStatus = "have" | "some" | "missing" | "staple";

/** How the cook's pantry covers one recipe ingredient. Staples count as on hand, as in the planner. */
export function ingredientStatus({
  need,
  have,
  isStaple,
}: {
  need: number;
  have: number | undefined;
  isStaple: boolean;
}): IngredientStatus {
  if (isStaple) return "staple";
  if (have === undefined || toHundredths(have) <= 0) return "missing";
  return toHundredths(have) >= toHundredths(need) ? "have" : "some";
}

const UNICODE_FRACTIONS: Record<string, number> = { "½": 1 / 2, "¼": 1 / 4, "¾": 3 / 4, "⅓": 1 / 3, "⅔": 2 / 3 };

/** The number a measure starts with ("1 1/2 cups" → 1.5) and the words after it, or null. */
function leadingAmount(measure: string): { value: number; rest: string } | null {
  const text = measure.trim().toLowerCase();
  let m = text.match(/^(\d+)\s+(\d+)\/(\d+)\s*(.*)$/);
  if (m) return { value: Number(m[1]) + Number(m[2]) / Number(m[3]), rest: m[4] ?? "" };
  m = text.match(/^(\d+)\/(\d+)\s*(.*)$/);
  if (m) return { value: Number(m[1]) / Number(m[2]), rest: m[3] ?? "" };
  m = text.match(/^(\d+(?:\.\d+)?)\s*([½¼¾⅓⅔])?\s*(.*)$/);
  if (m) return { value: Number(m[1]) + (m[2] ? (UNICODE_FRACTIONS[m[2]] ?? 0) : 0), rest: m[3] ?? "" };
  m = text.match(/^([½¼¾⅓⅔])\s*(.*)$/);
  if (m) return { value: UNICODE_FRACTIONS[m[1] ?? ""] ?? 0, rest: m[2] ?? "" };
  return null;
}

/** Words that name the ingredient's own unit, so "500 g" or "3 cloves" needs no hint. */
const OWN_UNIT_WORDS: Partial<Record<Unit, RegExp>> = {
  g: /^(g|grams?)\b/,
  ml: /^(ml|millilit(?:re|er)s?)\b/,
  clove: /^cloves?\b/,
  bunch: /^bunch(?:es)?\b/,
  pack: /^packs?\b/,
};

/** A measuring word: a counted amount next to one ("1 cup") was converted, so it gets a hint. */
const MEASURING_WORDS =
  /\b(cups?|tbsps?|tbs|tablespoons?|tsps?|teaspoons?|lbs?|pounds?|oz|ounces?|kg|g|grams?|ml|l|lit(?:re|er)s?|pinch|handful|cans?|tins?|slices?)\b/;

/**
 * "≈ 0.5 × onion" next to a recipe's "1/2 cup": the amount CookFlow-Ingest stored
 * for this line, in the ingredient's own unit, so Have / Missing make sense. It
 * only displays the stored number; nothing is converted here. Null for staples
 * (their amount is a placeholder) and when the source already says the same thing.
 */
export function conversionHint({
  sourceMeasure,
  quantity,
  unit,
  name,
  isStaple,
}: {
  sourceMeasure: string;
  quantity: number;
  unit: Unit;
  name: string;
  isStaple: boolean;
}): string | null {
  if (isStaple) return null;

  const source = leadingAmount(sourceMeasure);
  if (source && toHundredths(source.value) === toHundredths(quantity)) {
    const ownUnit = OWN_UNIT_WORDS[unit];
    const sameUnit = ownUnit ? ownUnit.test(source.rest) : !MEASURING_WORDS.test(source.rest);
    if (sameUnit) return null;
  }

  if (unit === "g" || unit === "ml") {
    const rounded = quantity >= 10 ? Math.round(quantity) : Math.round(quantity * 100) / 100;
    return `≈ ${rounded} ${unit}`;
  }
  if (unit === "whole" || unit === "count") return `≈ ${Math.round(quantity * 100) / 100} × ${name}`;
  return `≈ ${formatQuantity(quantity, unit)}`;
}
