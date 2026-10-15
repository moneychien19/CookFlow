import { daysBetween } from "@/lib/dates";
import type { IsoDate, Unit } from "@/lib/planner";

const PLURAL_UNITS: Partial<Record<Unit, [string, string]>> = {
  clove: ["clove", "cloves"],
  bunch: ["bunch", "bunches"],
  pack: ["pack", "packs"],
};

/** "450 g", "8 cloves", "1.5" (counted produce reads as a number next to its name). */
export function formatQuantity(quantity: number, unit: Unit): string {
  const n = Math.round(quantity * 100) / 100;
  if (unit === "g" || unit === "ml") return `${n} ${unit}`;
  const words = PLURAL_UNITS[unit];
  if (!words) return String(n);
  return `${n} ${n === 1 || n < 1 ? words[0] : words[1]}`;
}

const DATE_FORMAT = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" });

/** "Oct 16 (in 2 days)", "Oct 15 (tomorrow)", "Oct 12 (expired)". */
export function expiryText(expiresOn: IsoDate, today: IsoDate): string {
  const days = daysBetween(today, expiresOn);
  const relative =
    days < 0 ? "expired" : days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
  return `${DATE_FORMAT.format(new Date(`${expiresOn}T00:00:00Z`))} (${relative})`;
}

const AMOUNT_HINTS: Record<Unit, string> = {
  g: "in grams",
  ml: "in millilitres",
  whole: "how many, e.g. 0.5 for half",
  count: "how many",
  clove: "number of cloves",
  bunch: "number of bunches, e.g. 0.5",
  pack: "number of packs",
};

/** Shown under the amount field, so the cook types it in the ingredient's unit. */
export function amountHint(unit: Unit): string {
  return AMOUNT_HINTS[unit];
}
