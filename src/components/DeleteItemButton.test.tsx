// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DeleteItemButton } from "./DeleteItemButton";

// The real actions pull in Auth.js; these tests only drive the dialog.
vi.mock("@/app/pantry/actions", () => ({ deleteItem: vi.fn() }));

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  // jsdom doesn't implement modal dialogs; stand in for the browser's open/close.
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true;
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false;
  });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root.render(<DeleteItemButton id={7} name="onion" />));
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const dialog = () => host.querySelector("dialog");
const button = (text: string) =>
  [...host.querySelectorAll("button")].find((b) => b.textContent === text) as HTMLButtonElement;

describe("DeleteItemButton", () => {
  it("names the item on the button for screen readers, and starts closed", () => {
    expect(button("Delete").getAttribute("aria-label")).toBe("Delete onion");
    expect(dialog()?.open).toBe(false);
  });

  it("opens a modal dialog asking before anything is removed", () => {
    act(() => button("Delete").click());
    expect(dialog()?.open).toBe(true);
    expect(dialog()?.textContent).toContain("Remove onion from your pantry?");
    expect(dialog()?.getAttribute("aria-labelledby")).toBe(dialog()?.querySelector("h2")?.id);
  });

  it("sends the item id only from the dialog's own form", () => {
    const form = dialog()?.querySelector("form");
    expect(form?.querySelector<HTMLInputElement>('input[name="id"]')?.value).toBe("7");
    expect(form?.contains(button("Yes, delete"))).toBe(true);
  });

  it("closes on Cancel", () => {
    act(() => button("Delete").click());
    act(() => button("Cancel").click());
    expect(dialog()?.open).toBe(false);
  });
});
