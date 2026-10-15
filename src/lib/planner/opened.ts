import { isPartial, toHundredths } from "./quantity";
import type { Unit } from "./types";

/** Counted units where a fraction means something was cut: half an onion, part of a bunch. */
const CUT_UNITS: ReadonlySet<Unit> = new Set(["whole", "pack", "bunch"]);

/** Weighed or measured units, where only the flag can say an item is opened. */
export const WEIGHED_UNITS: ReadonlySet<Unit> = new Set(["g", "ml"]);

/**
 * SPEC §3 "opened item": flagged `opened`, or a `whole`/`pack`/`bunch` item with
 * 0 < quantity < 1. The one place this rule lives; pages use it for badges too.
 */
export function isOpened(item: { quantity: number; unit: Unit; opened: boolean }): boolean {
  const hundredths = toHundredths(item.quantity);
  if (hundredths <= 0) return false;
  return item.opened || (CUT_UNITS.has(item.unit) && isPartial(hundredths));
}
