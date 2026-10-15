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
