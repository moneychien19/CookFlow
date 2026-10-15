import { describe, expect, it } from "vitest";
import { expiryText, formatQuantity, pantryBadges } from "./pantry-display";

const TODAY = "2026-10-14";
const item = (overrides: Partial<Parameters<typeof pantryBadges>[0]> = {}) => ({
  quantity: 1,
  unit: "whole" as const,
  opened: false,
  expiresOn: null,
  ...overrides,
});

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
  it("says today, tomorrow, or in how many days", () => {
    expect(expiryText("2026-10-14", TODAY)).toBe("Expires today");
    expect(expiryText("2026-10-15", TODAY)).toBe("Expires tomorrow");
    expect(expiryText("2026-10-17", TODAY)).toBe("Expires in 3 days");
  });

  it("says expired for a past date", () => {
    expect(expiryText("2026-10-12", TODAY)).toBe("Expired");
  });
});

describe("pantryBadges", () => {
  it("shows no badges for a sealed item with no expiry date", () => {
    expect(pantryBadges(item(), TODAY)).toEqual([]);
  });

  it("marks half an onion and a flagged pack of bacon as opened", () => {
    expect(pantryBadges(item({ quantity: 0.5 }), TODAY)).toEqual([{ variant: "opened", text: "Opened" }]);
    expect(pantryBadges(item({ quantity: 150, unit: "g", opened: true }), TODAY)).toEqual([
      { variant: "opened", text: "Opened" },
    ]);
  });

  it("flags food expiring within 3 days, and expired food", () => {
    expect(pantryBadges(item({ expiresOn: "2026-10-17" }), TODAY)).toEqual([
      { variant: "expiring", text: "Expires in 3 days" },
    ]);
    expect(pantryBadges(item({ expiresOn: "2026-10-13" }), TODAY)).toEqual([{ variant: "expiring", text: "Expired" }]);
  });

  it("doesn't flag food expiring in 4 days", () => {
    expect(pantryBadges(item({ expiresOn: "2026-10-18" }), TODAY)).toEqual([]);
  });

  it("shows opened before expiring when both apply", () => {
    const badges = pantryBadges(item({ quantity: 0.5, expiresOn: "2026-10-15" }), TODAY);
    expect(badges.map((b) => b.text)).toEqual(["Opened", "Expires tomorrow"]);
  });
});
