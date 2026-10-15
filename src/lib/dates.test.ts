import { describe, expect, it } from "vitest";
import { addDays, daysBetween, todayIn, todayIso } from "./dates";

describe("dates", () => {
  it("adds days across a month end", () => {
    expect(addDays("2026-10-30", 3)).toBe("2026-11-02");
  });

  it("counts calendar days between two dates, negative when the first is later", () => {
    expect(daysBetween("2026-10-14", "2026-10-17")).toBe(3);
    expect(daysBetween("2026-10-14", "2026-10-13")).toBe(-1);
  });

  it("formats today as an ISO date in UTC", () => {
    expect(todayIso(new Date("2026-10-14T23:30:00Z"))).toBe("2026-10-14");
  });

  it("gives the cook's local date, which can still be yesterday in UTC terms", () => {
    // 01:59 UTC on Oct 15 is 21:59 on Oct 14 in New York.
    expect(todayIn("America/New_York", new Date("2026-10-15T01:59:00Z"))).toBe("2026-10-14");
    expect(todayIn("Asia/Taipei", new Date("2026-10-14T20:00:00Z"))).toBe("2026-10-15");
  });

  it("falls back to UTC for a missing or unknown time zone", () => {
    const now = new Date("2026-10-15T01:59:00Z");
    expect(todayIn(undefined, now)).toBe("2026-10-15");
    expect(todayIn("Mars/Olympus_Mons", now)).toBe("2026-10-15");
  });
});
