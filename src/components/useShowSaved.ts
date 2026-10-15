"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { PantryFormState } from "@/app/pantry/actions";

/**
 * After a successful pantry action, swap the URL to `/pantry?saved=…`: that
 * closes any edit row and shows the "Pantry updated" toast. Scrolling is off,
 * so the cook stays where they were in a long pantry.
 */
export function useShowSaved(state: PantryFormState) {
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) router.replace(`/pantry?saved=${state.savedAt}`, { scroll: false });
  }, [state, router]);
}
