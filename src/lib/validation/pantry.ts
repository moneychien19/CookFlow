import { z } from "zod";

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

const addItem = z.object({ ingredientId: id("Pick an ingredient"), quantity, expiresOn, opened });
const editItem = z.object({ id: id("Unknown item"), quantity, expiresOn, opened });
const deleteItem = z.object({ id: id("Unknown item") });

export type AddItemInput = z.infer<typeof addItem>;
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

function parse<T>(schema: z.ZodType<T>, formData: FormData): ParseResult<T> {
  const values = formValues(formData);

  const result = schema.safeParse(values);
  if (result.success) return { ok: true, data: result.data };

  const fieldErrors: Partial<Record<string, string>> = {};
  for (const issue of result.error.issues) {
    const field = String(issue.path[0] ?? "form");
    fieldErrors[field] ??= issue.message;
  }
  return { ok: false, fieldErrors, values };
}

export const parseAddItem = (formData: FormData) => parse(addItem, formData);
export const parseEditItem = (formData: FormData) => parse(editItem, formData);
export const parseDeleteItem = (formData: FormData) => parse(deleteItem, formData);
