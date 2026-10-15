/** Calendar dates as ISO strings ("YYYY-MM-DD"), computed in UTC so no time zone shifts a day. */
import type { IsoDate } from "@/lib/planner";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const toMs = (date: IsoDate) => Date.parse(`${date}T00:00:00Z`);

export function todayIso(now: Date): IsoDate {
  return now.toISOString().slice(0, 10);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return new Date(toMs(date) + days * MS_PER_DAY).toISOString().slice(0, 10);
}

export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((toMs(to) - toMs(from)) / MS_PER_DAY);
}
