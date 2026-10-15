import { describe, expect, it } from "vitest";
import { addDays, daysBetween, todayIso } from "./dates";

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
});
