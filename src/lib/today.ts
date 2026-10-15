import { cookies } from "next/headers";
import { todayIn } from "@/lib/dates";
import type { IsoDate } from "@/lib/planner";
import { TIME_ZONE_COOKIE } from "@/lib/time-zone";

/**
 * "Today" for this request, in the cook's time zone (from the cookie that
 * <TimeZoneCookie> sets), or UTC until the browser has reported it. Expiry
 * labels, the planner's urgency, and sample expiry dates all count from it.
 */
export async function requestToday(): Promise<IsoDate> {
  const timeZone = (await cookies()).get(TIME_ZONE_COOKIE)?.value;
  return todayIn(timeZone, new Date());
}
