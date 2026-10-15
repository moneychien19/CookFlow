import { describe, expect, it } from "vitest";
import { parseAddItem, parseDeleteItem, parseEditItem } from "./pantry";

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

describe("parseAddItem", () => {
  it("reads an ingredient, amount, expiry date, and opened checkbox", () => {
    const result = parseAddItem(form({ ingredientId: "12", quantity: "300", expiresOn: "2026-10-20", opened: "on" }));
    expect(result).toEqual({
      ok: true,
      data: { ingredient: { kind: "existing", id: 12 }, quantity: 300, expiresOn: "2026-10-20", opened: true },
    });
  });

  it("treats an empty expiry date as none and a missing checkbox as not opened", () => {
    const result = parseAddItem(form({ ingredientId: "12", quantity: "1.5", expiresOn: "" }));
    expect(result).toEqual({
      ok: true,
      data: { ingredient: { kind: "existing", id: 12 }, quantity: 1.5, expiresOn: null, opened: false },
    });
  });

  it("rounds the amount to 2 decimals", () => {
    const result = parseAddItem(form({ ingredientId: "12", quantity: "0.333", expiresOn: "" }));
    expect(result.ok && result.data.quantity).toBe(0.33);
  });

  it.each([
    ["", "Enter an amount"],
    ["abc", "Enter a number"],
    ["0", "Enter an amount greater than 0"],
    ["-2", "Enter an amount greater than 0"],
    ["0.001", "Enter an amount greater than 0"],
    ["1000000", "Enter an amount under 1,000,000"],
  ])("rejects the amount %j", (quantity, message) => {
    const result = parseAddItem(form({ ingredientId: "12", quantity, expiresOn: "" }));
    expect(result).toMatchObject({ ok: false, fieldErrors: { quantity: message } });
  });

  it("reads a new ingredient typed by the cook, tidied to lowercase single spaces", () => {
    const result = parseAddItem(form({ ingredientId: "", newName: "  Smoked   Tofu ", newUnit: "g", quantity: "200", expiresOn: "" }));
    expect(result).toEqual({
      ok: true,
      data: { ingredient: { kind: "new", name: "smoked tofu", unit: "g" }, quantity: 200, expiresOn: null, opened: false },
    });
  });

  it("asks for a unit for a new ingredient", () => {
    const result = parseAddItem(form({ ingredientId: "", newName: "smoked tofu", newUnit: "", quantity: "1", expiresOn: "" }));
    expect(result).toMatchObject({ ok: false, fieldErrors: { newUnit: "Pick a unit" } });
  });

  it("rejects a new ingredient name over 60 characters", () => {
    const result = parseAddItem(form({ ingredientId: "", newName: "x".repeat(61), newUnit: "g", quantity: "1", expiresOn: "" }));
    expect(result).toMatchObject({ ok: false, fieldErrors: { newName: "Use 60 characters or fewer" } });
  });

  it("reports the ingredient and the amount errors together", () => {
    const result = parseAddItem(form({ ingredientId: "", newName: "tofu", newUnit: "", quantity: "0", expiresOn: "" }));
    expect(result).toMatchObject({
      ok: false,
      fieldErrors: { newUnit: "Pick a unit", quantity: "Enter an amount greater than 0" },
    });
  });

  it("asks for an ingredient when none is picked", () => {
    const result = parseAddItem(form({ ingredientId: "", quantity: "1", expiresOn: "" }));
    expect(result).toMatchObject({ ok: false, fieldErrors: { ingredientId: "Pick an ingredient" } });
  });

  it("rejects a malformed date", () => {
    const result = parseAddItem(form({ ingredientId: "12", quantity: "1", expiresOn: "2026-13-40" }));
    expect(result).toMatchObject({ ok: false, fieldErrors: { expiresOn: "Enter a valid date" } });
  });

  it("returns what was typed, so the form can show it again", () => {
    const result = parseAddItem(form({ ingredientId: "12", quantity: "abc", expiresOn: "2026-10-20" }));
    expect(result).toMatchObject({ ok: false, values: { ingredientId: "12", quantity: "abc", expiresOn: "2026-10-20" } });
  });
});

describe("parseEditItem", () => {
  it("reads the item id with the new amount", () => {
    const result = parseEditItem(form({ id: "7", quantity: "2", expiresOn: "" }));
    expect(result).toEqual({ ok: true, data: { id: 7, quantity: 2, expiresOn: null, opened: false } });
  });

  it("rejects a non-numeric item id", () => {
    expect(parseEditItem(form({ id: "seven", quantity: "2", expiresOn: "" })).ok).toBe(false);
  });
});

describe("parseDeleteItem", () => {
  it("reads the item id", () => {
    expect(parseDeleteItem(form({ id: "7" }))).toEqual({ ok: true, data: { id: 7 } });
  });
});
