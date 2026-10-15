// @vitest-environment jsdom
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Badge } from "./Badge";
import { Button, buttonClass } from "./Button";
import { Card } from "./Card";
import { EmptyState } from "./EmptyState";
import { TextField } from "./Input";
import { StatBadgePair } from "./StatBadgePair";
import { Toast } from "./Toast";

function render(element: ReactElement): HTMLElement {
  const host = document.createElement("div");
  host.innerHTML = renderToStaticMarkup(element);
  const root = host.firstElementChild;
  if (!(root instanceof HTMLElement)) throw new Error("nothing rendered");
  return root;
}

describe("Button", () => {
  it("does not submit a form unless asked to", () => {
    expect(render(<Button>Save</Button>).getAttribute("type")).toBe("button");
    expect(render(<Button type="submit">Save</Button>).getAttribute("type")).toBe("submit");
  });

  it.each([
    ["primary", "bg-primary"],
    ["secondary", "bg-stone"],
    ["outline", "border-stone"],
  ] as const)("renders the %s variant as a 44px pill", (variant, colorClass) => {
    const button = render(<Button variant={variant}>Go</Button>);
    expect(button.classList).toContain(colorClass);
    expect(button.classList).toContain("rounded-full");
    expect(button.classList).toContain("min-h-touch");
  });

  it("defaults to the stone secondary variant, so blue is always a deliberate choice", () => {
    expect(render(<Button>Go</Button>).classList).toContain("bg-stone");
  });

  it("exposes the same styling for links that look like buttons", () => {
    expect(buttonClass("outline")).toContain("rounded-full");
  });
});

describe("Badge", () => {
  it.each([
    ["opened", "Opened", "bg-gold-pale/50", "text-espresso"],
    ["have", "Have", "bg-sage-pale", "text-forest"],
    ["missing", "Missing", "border-hairline", "text-stone"],
    ["neutral", "Skipped", "border-silver", "text-stone"],
  ] as const)("shows the %s status as text, not only color", (variant, text, bg, fg) => {
    const badge = render(<Badge variant={variant}>{text}</Badge>);
    expect(badge.textContent).toBe(text);
    expect(badge.classList).toContain(bg);
    expect(badge.classList).toContain(fg);
  });
});

describe("TextField", () => {
  it("links the label to the input", () => {
    const field = render(<TextField label="Quantity" name="quantity" />);
    const input = field.querySelector("input");
    expect(field.querySelector("label")?.getAttribute("for")).toBe(input?.id);
    expect(input?.classList).toContain("border-hairline");
  });

  it("marks an invalid field and describes it with the error message", () => {
    const field = render(<TextField label="Quantity" name="quantity" error="Enter a number above 0." />);
    const input = field.querySelector("input");
    const messageId = input?.getAttribute("aria-describedby") ?? "";
    expect(input?.getAttribute("aria-invalid")).toBe("true");
    expect(input?.classList).toContain("border-error");
    expect(field.querySelector(`#${messageId}`)?.textContent).toBe("Enter a number above 0.");
  });

  it("uses the error color only when the field is invalid", () => {
    const input = render(<TextField label="Quantity" name="quantity" />).querySelector("input");
    expect(input?.hasAttribute("aria-invalid")).toBe(false);
    expect(input?.className).not.toContain("error");
  });
});

describe("Card", () => {
  it("renders a white hairline card as the requested element", () => {
    const card = render(<Card as="article">Soup</Card>);
    expect(card.tagName).toBe("ARTICLE");
    expect(card.classList).toContain("bg-surface");
    expect(card.classList).toContain("border-hairline");
    expect(card.classList).toContain("rounded-lg");
  });
});

describe("StatBadgePair", () => {
  it("reads as before and after, with before in gold and after in olive", () => {
    const pair = render(<StatBadgePair label="Opened items" before={3} after={1} />);
    expect(pair.textContent).toContain("Opened items");
    expect(pair.querySelector("[data-stat=before]")?.textContent).toContain("3");
    expect(pair.querySelector("[data-stat=before] .text-gold")).not.toBeNull();
    expect(pair.querySelector("[data-stat=after]")?.textContent).toContain("1");
    expect(pair.querySelector("[data-stat=after] .text-olive")).not.toBeNull();
  });
});

describe("EmptyState", () => {
  it("shows one sentence and its action", () => {
    const empty = render(
      <EmptyState message="Your pantry is empty." action={<Button variant="primary">Load sample pantry</Button>} />,
    );
    expect(empty.textContent).toContain("Your pantry is empty.");
    expect(empty.querySelectorAll("button")).toHaveLength(1);
  });
});

describe("Toast", () => {
  it("announces its message politely to screen readers", () => {
    const toast = render(<Toast>Pantry updated</Toast>);
    expect(toast.getAttribute("role")).toBe("status");
    expect(toast.textContent).toBe("Pantry updated");
    expect(toast.classList).toContain("shadow-soft");
  });
});
