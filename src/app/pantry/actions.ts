"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { replacePantryWithSample } from "@/lib/db/pantry";
import { todayIso } from "@/lib/dates";
import { SAMPLE_PANTRY } from "@/lib/sample-pantry";
import { requireUserId } from "@/lib/session";

/** "Load sample pantry": replaces the user's pantry with SAMPLE_PANTRY. Takes no input. */
export async function loadSamplePantry() {
  const userId = await requireUserId();
  const result = await replacePantryWithSample(getDb(), userId, SAMPLE_PANTRY, todayIso(new Date()));
  // A mismatch means the sample and the deployed catalog drifted apart: a bug, not a user error.
  if (!result.ok) throw new Error(result.error);
  revalidatePath("/pantry");
}
