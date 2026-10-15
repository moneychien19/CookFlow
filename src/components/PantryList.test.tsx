// @vitest-environment jsdom
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { PantryRow } from "@/lib/db/pantry";
import { PantryList } from "./PantryList";

// The real actions pull in Auth.js; these tests only render markup.
vi.mock("@/app/pantry/actions", () => ({ addItem: vi.fn(), editItem: vi.fn(), deleteItem: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));

const TODAY = "2026-10-14";
const row = (overrides: Partial<PantryRow>): PantryRow => ({
  id: 1,
  ingredientId: 1,
  name: "onion",
  unit: "whole",
  isStaple: false,
  quantity: 1,
  expiresOn: null,
  opened: false,
  ...overrides,
});

function render(items: PantryRow[], editId: number | null = null) {
  const host = document.createElement("div");
  host.innerHTML = renderToStaticMarkup(<PantryList items={items} today={TODAY} editId={editId} />);
  return host;
}

describe("PantryList", () => {
  const items = [
    row({ id: 1, name: "chicken breast", unit: "g", quantity: 450, expiresOn: "2026-10-15" }),
    row({ id: 2, name: "bacon", unit: "g", quantity: 150, opened: true }),
    row({ id: 3, name: "onion", quantity: 0.5 }),
  ];

  it("shows each item once in the desktop table and once as a mobile card", () => {
    const host = render(items);
    expect(host.querySelectorAll("tbody tr")).toHaveLength(3);
    expect(host.querySelectorAll("ul > li")).toHaveLength(3);
  });

  it("shows the amount in the ingredient's unit", () => {
    const firstRow = render(items).querySelector("tbody tr");
    expect(firstRow?.textContent).toContain("chicken breast");
    expect(firstRow?.textContent).toContain("450 g");
  });

  it("says how far away each expiry date is", () => {
    const firstRow = render(items).querySelector("tbody tr");
    expect(firstRow?.textContent).toContain("Oct 15 (tomorrow)");
  });

  it("marks opened items with an Opened label, including half an onion", () => {
    const rows = [...render(items).querySelectorAll("tbody tr")].map((tr) => tr.textContent ?? "");
    expect(rows.map((text) => text.includes("Opened"))).toEqual([false, true, true]);
  });

  it("gives the table column headers", () => {
    const headers = [...render(items).querySelectorAll("thead th")].map((th) => th.textContent);
    expect(headers).toEqual(["Ingredient", "Amount", "Expires", "Status", "Actions"]);
  });

  it("names the item in each Edit and Delete control for screen readers", () => {
    const labels = [...render(items).querySelectorAll("table [aria-label]")].map((el) => el.getAttribute("aria-label"));
    expect(labels).toContain("Edit bacon");
    expect(labels).toContain("Delete bacon");
  });

  it("asks in a dialog before deleting", () => {
    const row = render(items).querySelector("tbody tr");
    expect(row?.querySelector("dialog")?.textContent).toContain("Remove chicken breast from your pantry?");
  });

  it("turns the row being edited into a form filled with its values", () => {
    const row = render(items, 2).querySelectorAll("tbody tr")[1];
    const quantity = row?.querySelector<HTMLInputElement>('input[name="quantity"]');
    expect(quantity?.value).toBe("150");
    expect(row?.querySelector<HTMLInputElement>('input[name="opened"]')?.checked).toBe(true);
  });

  it("offers the opened box only for weighed items", () => {
    const onionRow = render(items, 3).querySelectorAll("tbody tr")[2];
    expect(onionRow?.querySelector('input[name="opened"]')).toBeNull();
  });

  it("keeps ids unique while a row is edited, though the table and the cards both render it", () => {
    const ids = [...render(items, 2).querySelectorAll("[id]")].map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
