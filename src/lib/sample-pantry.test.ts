import { describe, expect, it } from "vitest";
import { SAMPLE_PANTRY } from "./sample-pantry";

const WEIGHED = new Set(["g", "ml"]);

describe("SAMPLE_PANTRY", () => {
  it("lists each ingredient once, since the pantry is unique per ingredient", () => {
    const names = SAMPLE_PANTRY.map((item) => item.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("has positive quantities with at most 2 decimals", () => {
    for (const { name, quantity } of SAMPLE_PANTRY) {
      expect(quantity, name).toBeGreaterThan(0);
      expect(Math.round(quantity * 100) / 100, name).toBe(quantity);
    }
  });

  it("flags opened only on weighed items", () => {
    const flaggedCounted = SAMPLE_PANTRY.filter((item) => item.opened && !WEIGHED.has(item.unit));
    expect(flaggedCounted).toEqual([]);
  });

  it("has opened and expiring food for the planner to use first", () => {
    expect(SAMPLE_PANTRY.some((item) => item.opened)).toBe(true);
    expect(SAMPLE_PANTRY.some((item) => !WEIGHED.has(item.unit) && item.quantity < 1)).toBe(true);
    expect(SAMPLE_PANTRY.some((item) => item.expiresInDays !== null && item.expiresInDays <= 3)).toBe(true);
  });
});
