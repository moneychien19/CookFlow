import { describe, expect, it } from "vitest";
import { isPartial, toHundredths } from "./quantity";

describe("quantities", () => {
  it("treats 1 - 0.5 - 0.5 as empty, not partial", () => {
    const remaining = toHundredths(1 - 0.5 - 0.5);
    expect(remaining).toBe(0);
    expect(isPartial(remaining)).toBe(false);
  });

  it("treats float noise just below zero as empty, not partial", () => {
    expect(isPartial(toHundredths(0.3 - 0.1 - 0.2))).toBe(false);
  });

  it("rounds float sums to exact hundredths", () => {
    expect(toHundredths(0.1 + 0.2)).toBe(30);
  });

  it("counts half an onion as partial and a whole one as not", () => {
    expect(isPartial(toHundredths(0.5))).toBe(true);
    expect(isPartial(toHundredths(1))).toBe(false);
  });
});
