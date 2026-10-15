"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db/client";
import { addPantryItem, deletePantryItem, editPantryItem, replacePantryWithSample } from "@/lib/db/pantry";
import { SAMPLE_PANTRY } from "@/lib/sample-pantry";
import { requireUserId } from "@/lib/session";
import { requestToday } from "@/lib/today";
import { type FormValues, formValues, parseAddItem, parseDeleteItem, parseEditItem } from "@/lib/validation/pantry";

/**
 * A pantry form's result. On failure: the errors and what was typed (`submittedAt`
 * remounts the form to show it). On success: `savedAt`, which the client turns into
 * `/pantry?saved=…` with scrolling off, so the cook stays where they were.
 */
export type PantryFormState =
  | { ok: false; fieldErrors: Partial<Record<string, string>>; values: FormValues; submittedAt: number }
  | { ok: true; savedAt: number }
  | null;

const failed = (fieldErrors: Partial<Record<string, string>>, values: FormValues): PantryFormState => ({
  ok: false,
  fieldErrors,
  values,
  submittedAt: Date.now(),
});

function saved(): PantryFormState {
  revalidatePath("/pantry");
  return { ok: true, savedAt: Date.now() };
}

/** "Load sample pantry": replaces the user's pantry with SAMPLE_PANTRY. Takes no input. */
export async function loadSamplePantry() {
  const userId = await requireUserId();
  const result = await replacePantryWithSample(getDb(), userId, SAMPLE_PANTRY, await requestToday());
  // A mismatch means the sample and the deployed catalog drifted apart: a bug, not a user error.
  if (!result.ok) throw new Error(result.error);
  revalidatePath("/pantry");
  // The button sits at the top of the page, so the redirect's scroll to the top doesn't move anything.
  redirect(`/pantry?saved=${Date.now()}`);
}

export async function addItem(_state: PantryFormState, formData: FormData): Promise<PantryFormState> {
  const userId = await requireUserId();
  const parsed = parseAddItem(formData);
  if (!parsed.ok) return failed(parsed.fieldErrors, parsed.values);

  const result = await addPantryItem(getDb(), userId, parsed.data);
  if (!result.ok) {
    const field = parsed.data.ingredient.kind === "new" ? "newName" : "ingredientId";
    return failed({ [field]: result.error }, formValues(formData));
  }
  return saved();
}

export async function editItem(_state: PantryFormState, formData: FormData): Promise<PantryFormState> {
  const userId = await requireUserId();
  const parsed = parseEditItem(formData);
  if (!parsed.ok) return failed(parsed.fieldErrors, parsed.values);

  const result = await editPantryItem(getDb(), userId, parsed.data);
  if (!result.ok) return failed({ form: result.error }, formValues(formData));
  return saved();
}

export async function deleteItem(_state: PantryFormState, formData: FormData): Promise<PantryFormState> {
  const userId = await requireUserId();
  const parsed = parseDeleteItem(formData);
  if (!parsed.ok) return failed(parsed.fieldErrors, parsed.values);

  const result = await deletePantryItem(getDb(), userId, parsed.data.id);
  if (!result.ok) return failed({ form: result.error }, formValues(formData));
  return saved();
}
