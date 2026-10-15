"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { TIME_ZONE_COOKIE } from "@/lib/time-zone";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Tells the server the browser's time zone, so "expires today" means the cook's
 * today. Re-renders once when the cookie is new or the zone changed (travel).
 * Only the zone name is sent; it isn't stored anywhere else.
 */
export function TimeZoneCookie() {
  const router = useRouter();
  useEffect(() => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const current = document.cookie
      .split("; ")
      .find((pair) => pair.startsWith(`${TIME_ZONE_COOKIE}=`))
      ?.split("=")[1];
    if (current === encodeURIComponent(timeZone)) return;
    document.cookie = `${TIME_ZONE_COOKIE}=${encodeURIComponent(timeZone)}; path=/; max-age=${ONE_YEAR_SECONDS}; samesite=lax`;
    router.refresh();
  }, [router]);
  return null;
}
