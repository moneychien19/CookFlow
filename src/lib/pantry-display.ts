import type { BadgeVariant } from "@/components/ui/Badge";
import { daysBetween } from "@/lib/dates";
import { isOpened, type IsoDate, type Unit } from "@/lib/planner";

/** Food expiring within this many days (or already expired) gets the expiring badge. */
export const EXPIRING_SOON_DAYS = 3;

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

export function expiryText(expiresOn: IsoDate, today: IsoDate): string {
  const days = daysBetween(today, expiresOn);
  if (days < 0) return "Expired";
  if (days === 0) return "Expires today";
  if (days === 1) return "Expires tomorrow";
  return `Expires in ${days} days`;
}

type BadgeItem = { quantity: number; unit: Unit; opened: boolean; expiresOn: IsoDate | null };

/** Status badges for a pantry item, always with text (CLAUDE.md: never color alone). */
export function pantryBadges(item: BadgeItem, today: IsoDate): { variant: BadgeVariant; text: string }[] {
  const badges: { variant: BadgeVariant; text: string }[] = [];
  if (isOpened(item)) badges.push({ variant: "opened", text: "Opened" });
  if (item.expiresOn !== null && daysBetween(today, item.expiresOn) <= EXPIRING_SOON_DAYS) {
    badges.push({ variant: "expiring", text: expiryText(item.expiresOn, today) });
  }
  return badges;
}
