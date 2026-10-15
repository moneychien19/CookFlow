import { describe, expect, it } from "vitest";
import { amountHint, expiryText, formatQuantity } from "./pantry-display";

const TODAY = "2026-10-14";
describe("formatQuantity", () => {
  it("shows weights and volumes with their unit", () => {
    expect(formatQuantity(450, "g")).toBe("450 g");
    expect(formatQuantity(500, "ml")).toBe("500 ml");
  });

  it("shows counted produce and eggs as a bare number", () => {
    expect(formatQuantity(1.5, "whole")).toBe("1.5");
    expect(formatQuantity(6, "count")).toBe("6");
  });

  it("pluralizes cloves, bunches, and packs", () => {
    expect(formatQuantity(1, "clove")).toBe("1 clove");
    expect(formatQuantity(8, "clove")).toBe("8 cloves");
    expect(formatQuantity(0.5, "bunch")).toBe("0.5 bunch");
    expect(formatQuantity(2, "bunch")).toBe("2 bunches");
    expect(formatQuantity(2, "pack")).toBe("2 packs");
  });

  it("drops float noise and trailing zeros", () => {
    expect(formatQuantity(0.1 + 0.2, "whole")).toBe("0.3");
    expect(formatQuantity(226.8, "g")).toBe("226.8 g");
  });
});

describe("expiryText", () => {
  it("gives the date and how far away it is", () => {
    expect(expiryText("2026-10-14", TODAY)).toBe("Oct 14 (today)");
    expect(expiryText("2026-10-15", TODAY)).toBe("Oct 15 (tomorrow)");
    expect(expiryText("2026-10-17", TODAY)).toBe("Oct 17 (in 3 days)");
    expect(expiryText("2026-11-02", TODAY)).toBe("Nov 2 (in 19 days)");
  });

  it("says expired for a past date", () => {
    expect(expiryText("2026-10-12", TODAY)).toBe("Oct 12 (expired)");
  });
});

describe("amountHint", () => {
  it("tells the cook which unit to type the amount in", () => {
    expect(amountHint("g")).toBe("in grams");
    expect(amountHint("ml")).toBe("in millilitres");
    expect(amountHint("whole")).toBe("how many, e.g. 0.5 for half");
    expect(amountHint("clove")).toBe("number of cloves");
  });
});
