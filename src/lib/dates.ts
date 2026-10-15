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

/** The calendar date in `timeZone` (an IANA name like "America/New_York"); UTC when it's missing or unknown. */
export function todayIn(timeZone: string | undefined, now: Date): IsoDate {
  if (!timeZone) return todayIso(now);
  try {
    // en-CA formats dates as YYYY-MM-DD.
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  } catch {
    return todayIso(now); // RangeError: not a time zone this runtime knows
  }
}
