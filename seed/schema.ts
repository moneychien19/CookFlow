import { z } from "zod";
import { UNITS } from "@/lib/planner/types";

/** Fits numeric(6,2): above 0, at most 9999.99, at most 2 decimals. */
const quantity = z
  .number()
  .positive()
  .max(9999.99)
  .refine((q) => Math.abs(q * 100 - Math.round(q * 100)) < 1e-9, "at most 2 decimals");

const ingredientName = z.string().regex(/^[a-z][a-z -]*[a-z]$/, "lowercase and trimmed, e.g. \"chicken breast\"");

export const ingredientSeed = z.object({
  name: ingredientName,
  unit: z.enum(UNITS),
  isStaple: z.boolean().default(false),
});

export const recipeSeed = z.object({
  source: z.string().min(1),
  sourceId: z.string().min(1),
  title: z.string().min(1),
  imageUrl: z.url().nullable(),
  /** Kept whole, never rewritten (SPEC §7a #10). */
  instructions: z.string().min(1),
  servings: z.int().positive().nullable(),
  tags: z.array(z.string().min(1)),
  ingredients: z
    .array(
      z.object({
        ingredient: ingredientName,
        quantity,
        /** Exactly as the source wrote them (SPEC §7a #9). */
        sourceName: z.string().min(1),
        sourceMeasure: z.string(),
      }),
    )
    .min(1),
});

export const samplePantrySeed = z.object({
  ingredient: ingredientName,
  quantity,
  /** Relative, so the sample pantry is realistic whenever it's loaded. */
  expiresInDays: z.int().nonnegative().nullable(),
});

export type IngredientSeed = z.infer<typeof ingredientSeed>;
export type RecipeSeed = z.infer<typeof recipeSeed>;
export type SamplePantrySeed = z.infer<typeof samplePantrySeed>;
export type SeedData = { ingredients: IngredientSeed[]; recipes: RecipeSeed[]; samplePantry: SamplePantrySeed[] };

export type SeedResult = { ok: true; data: SeedData } | { ok: false; error: string };

const FILES = [
  ["ingredients", "seed/ingredients.json", z.array(ingredientSeed)],
  ["recipes", "seed/recipes.json", z.array(recipeSeed)],
  ["samplePantry", "seed/sample-pantry.json", z.array(samplePantrySeed)],
] as const;

function duplicates(values: string[]): string[] {
  return [...new Set(values.filter((v, i) => values.indexOf(v) !== i))];
}

/** Validates the three seed files and the references between them. */
export function parseSeed(raw: { ingredients: unknown; recipes: unknown; samplePantry: unknown }): SeedResult {
  const errors: string[] = [];
  const parsed: Partial<SeedData> = {};
  for (const [key, file, schema] of FILES) {
    const result = schema.safeParse(raw[key]);
    if (result.success) Object.assign(parsed, { [key]: result.data });
    else errors.push(`${file}:\n${z.prettifyError(result.error)}`);
  }
  const { ingredients, recipes, samplePantry } = parsed;
  if (!ingredients || !recipes || !samplePantry) return { ok: false, error: errors.join("\n\n") };

  const known = new Set(ingredients.map((i) => i.name));
  for (const name of duplicates(ingredients.map((i) => i.name))) {
    errors.push(`Duplicate ingredient "${name}" in seed/ingredients.json`);
  }
  for (const id of duplicates(recipes.map((r) => `${r.source}/${r.sourceId}`))) {
    errors.push(`Duplicate recipe "${id}" in seed/recipes.json`);
  }
  for (const recipe of recipes) {
    const used = recipe.ingredients.map((l) => l.ingredient);
    for (const name of used.filter((n) => !known.has(n))) {
      errors.push(`${recipe.title} uses unknown ingredient "${name}"`);
    }
    for (const name of duplicates(used)) errors.push(`${recipe.title} lists "${name}" twice`);
  }
  for (const item of samplePantry.filter((i) => !known.has(i.ingredient))) {
    errors.push(`Sample pantry uses unknown ingredient "${item.ingredient}"`);
  }

  return errors.length > 0
    ? { ok: false, error: errors.join("\n") }
    : { ok: true, data: { ingredients, recipes, samplePantry } };
}
