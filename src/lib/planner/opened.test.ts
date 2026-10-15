import { describe, expect, it } from "vitest";
import { isOpened } from "./opened";

describe("isOpened", () => {
  it("counts half an onion as opened without the flag", () => {
    expect(isOpened({ quantity: 0.5, unit: "whole", opened: false })).toBe(true);
  });

  it("counts a whole onion as not opened", () => {
    expect(isOpened({ quantity: 1, unit: "whole", opened: false })).toBe(false);
  });

  it("treats 1 - 0.5 - 0.5 of a bunch as empty, not opened", () => {
    expect(isOpened({ quantity: 1 - 0.5 - 0.5, unit: "bunch", opened: false })).toBe(false);
  });

  it("counts a flagged 300 g pack of bacon as opened and an unflagged one as sealed", () => {
    expect(isOpened({ quantity: 300, unit: "g", opened: true })).toBe(true);
    expect(isOpened({ quantity: 300, unit: "g", opened: false })).toBe(false);
  });

  it("doesn't infer opened from a small weight", () => {
    expect(isOpened({ quantity: 0.5, unit: "ml", opened: false })).toBe(false);
  });

  it("doesn't count half a garlic clove or half an egg as opened", () => {
    expect(isOpened({ quantity: 0.5, unit: "clove", opened: false })).toBe(false);
    expect(isOpened({ quantity: 0.5, unit: "count", opened: false })).toBe(false);
  });
});
