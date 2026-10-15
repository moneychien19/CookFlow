import { z } from "zod";
import { normalizeIngredientName } from "@/lib/ingredient-search";
import { UNITS } from "@/lib/planner/types";

/** numeric(8,2): the largest amount the quantity column holds. */
const MAX_QUANTITY = 999999.99;

const round2 = (n: number) => Math.round(n * 100) / 100;

const id = (message: string) =>
  z.string().regex(/^\d+$/, message).transform(Number).pipe(z.number().int().positive(message));

const quantity = z
  .string()
  .trim()
  .min(1, "Enter an amount")
  .transform(Number)
  .pipe(z.number({ error: "Enter a number" }))
  .transform(round2)
  .pipe(
    z
      .number()
      .gt(0, "Enter an amount greater than 0")
      .lte(MAX_QUANTITY, "Enter an amount under 1,000,000"),
  );

const expiresOn = z.union([
  z.literal("").transform(() => null),
  z.iso.date({ error: "Enter a valid date" }),
]);

/** An unticked checkbox isn't sent at all. */
const opened = z
  .literal("on")
  .optional()
  .transform((value) => value === "on");

const itemFields = z.object({ quantity, expiresOn, opened });

const existingIngredient = z
  .object({ ingredientId: id("Pick an ingredient") })
  .transform(({ ingredientId }) => ({ kind: "existing" as const, id: ingredientId }));

/** A name the cook typed: lowercase with single spaces, like the catalog's names. */
const newIngredient = z
  .object({
    newName: z
      .string()
      .transform(normalizeIngredientName)
      .pipe(z.string().min(1, "Type an ingredient").max(60, "Use 60 characters or fewer")),
    newUnit: z.enum(UNITS, { error: "Pick a unit" }),
  })
  .transform(({ newName, newUnit }) => ({ kind: "new" as const, name: newName, unit: newUnit }));

const editItem = z.object({ id: id("Unknown item"), quantity, expiresOn, opened });
const deleteItem = z.object({ id: id("Unknown item") });

export type AddItemInput = z.infer<typeof itemFields> & {
  ingredient: z.infer<typeof existingIngredient> | z.infer<typeof newIngredient>;
};
export type EditItemInput = z.infer<typeof editItem>;

/** The form's text fields as submitted, for refilling the form after an error. */
export type FormValues = Record<string, string>;

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; fieldErrors: Partial<Record<string, string>>; values: FormValues };

export function formValues(formData: FormData): FormValues {
  const values: FormValues = {};
  for (const [key, value] of formData) if (typeof value === "string") values[key] = value;
  return values;
}

function errorsOf(error: z.ZodError, into: Partial<Record<string, string>>) {
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    into[field] ??= issue.message;
  }
}

function parse<T>(schema: z.ZodType<T>, formData: FormData): ParseResult<T> {
  const values = formValues(formData);
  const result = schema.safeParse(values);
  if (result.success) return { ok: true, data: result.data };
  const fieldErrors: Partial<Record<string, string>> = {};
  errorsOf(result.error, fieldErrors);
  return { ok: false, fieldErrors, values };
}

/** An ingredient from the list (`ingredientId`), or a new one (`newName` + `newUnit`) when no id is sent. */
export function parseAddItem(formData: FormData): ParseResult<AddItemInput> {
  const values = formValues(formData);
  const isNew = !values.ingredientId && Boolean(values.newName?.trim());
  const fields = itemFields.safeParse(values);
  const ingredient = (isNew ? newIngredient : existingIngredient).safeParse(values);
  if (fields.success && ingredient.success) return { ok: true, data: { ...fields.data, ingredient: ingredient.data } };

  const fieldErrors: Partial<Record<string, string>> = {};
  if (!ingredient.success) errorsOf(ingredient.error, fieldErrors);
  if (!fields.success) errorsOf(fields.error, fieldErrors);
  return { ok: false, fieldErrors, values };
}
export const parseEditItem = (formData: FormData) => parse(editItem, formData);
export const parseDeleteItem = (formData: FormData) => parse(deleteItem, formData);
