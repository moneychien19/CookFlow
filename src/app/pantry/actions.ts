"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { addPantryItem, deletePantryItem, editPantryItem, replacePantryWithSample } from "@/lib/db/pantry";
import { todayIso } from "@/lib/dates";
import { SAMPLE_PANTRY } from "@/lib/sample-pantry";
import { requireUserId } from "@/lib/session";
import { type FormValues, formValues, parseAddItem, parseDeleteItem, parseEditItem } from "@/lib/validation/pantry";

/** What a pantry form shows after a failed submit. `submittedAt` remounts the form with `values`. */
export type PantryFormState = {
  fieldErrors: Partial<Record<string, string>>;
  values: FormValues;
  submittedAt: number;
} | null;

/** Back to the plain pantry (closing any edit row), with a fresh key for the "Pantry updated" toast. */
function backToPantry(): never {
  revalidatePath("/pantry");
  redirect(`/pantry?saved=${Date.now()}`);
}

/** "Load sample pantry": replaces the user's pantry with SAMPLE_PANTRY. Takes no input. */
export async function loadSamplePantry() {
  const userId = await requireUserId();
  const result = await replacePantryWithSample(getDb(), userId, SAMPLE_PANTRY, todayIso(new Date()));
  // A mismatch means the sample and the deployed catalog drifted apart: a bug, not a user error.
  if (!result.ok) throw new Error(result.error);
  backToPantry();
}

export async function addItem(_state: PantryFormState, formData: FormData): Promise<PantryFormState> {
  const userId = await requireUserId();
  const parsed = parseAddItem(formData);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors, values: parsed.values, submittedAt: Date.now() };

  const result = await addPantryItem(getDb(), userId, parsed.data);
  if (!result.ok) {
    const field = parsed.data.ingredient.kind === "new" ? "newName" : "ingredientId";
    return { fieldErrors: { [field]: result.error }, values: formValues(formData), submittedAt: Date.now() };
  }
  backToPantry();
}

export async function editItem(_state: PantryFormState, formData: FormData): Promise<PantryFormState> {
  const userId = await requireUserId();
  const parsed = parseEditItem(formData);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors, values: parsed.values, submittedAt: Date.now() };

  const result = await editPantryItem(getDb(), userId, parsed.data);
  if (!result.ok) {
    return { fieldErrors: { form: result.error }, values: formValues(formData), submittedAt: Date.now() };
  }
  backToPantry();
}

export async function deleteItem(formData: FormData) {
  const userId = await requireUserId();
  const parsed = parseDeleteItem(formData);
  // Already gone (a double click) or not this user's: nothing to delete, nothing to report.
  if (parsed.ok && (await deletePantryItem(getDb(), userId, parsed.data.id)).ok) backToPantry();
  redirect("/pantry");
}
