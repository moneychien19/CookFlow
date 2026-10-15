// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PantryRow } from "@/lib/db/pantry";
import { EditPantryItemForm } from "./PantryItemForm";

// The real actions pull in Auth.js; these tests only drive the form in the browser.
const actions = vi.hoisted(() => ({ addItem: vi.fn(), editItem: vi.fn(), deleteItem: vi.fn() }));
vi.mock("@/app/pantry/actions", () => actions);
const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("next/link", () => ({
  default: ({ href, scroll, ...props }: { href: string; scroll?: boolean }) => (
    <a href={href} data-scroll={String(scroll)} {...props} />
  ),
}));

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const MILK: PantryRow = {
  id: 9,
  ingredientId: 3,
  name: "milk",
  unit: "ml",
  isStaple: false,
  quantity: 500,
  expiresOn: null,
  opened: true,
};

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root.render(<EditPantryItemForm item={MILK} />));
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("EditPantryItemForm", () => {
  it("moves focus to the amount, which also brings the form into view", () => {
    expect(document.activeElement?.getAttribute("name")).toBe("quantity");
  });

  it("cancels without scrolling the page", () => {
    expect(host.querySelector("a")?.getAttribute("data-scroll")).toBe("false");
  });

  it("after saving, closes the row and shows the toast without scrolling the page", async () => {
    actions.editItem.mockResolvedValue({ ok: true, savedAt: 5 });
    await act(async () => host.querySelector("form")?.requestSubmit());
    expect(router.replace).toHaveBeenCalledWith("/pantry?saved=5", { scroll: false });
  });
});
