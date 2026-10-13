import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/styles/globals.css", "utf8");

function hex(token: string): string {
  const value = css.match(new RegExp(`--color-${token}:\\s*(#[0-9a-f]{6});`))?.[1];
  if (!value) throw new Error(`no color token ${token}`);
  return value;
}

function luminance(color: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(color.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(fg: string, bg: string): number {
  const [hi, lo] = [luminance(hex(fg)), luminance(hex(bg))].sort((a, b) => b - a) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

// Text/background pairs the UI primitives use. AA: 4.5 for normal text, 3 for ≥24px.
const PAIRS: [fg: string, bg: string, min: number, where: string][] = [
  ["ink", "canvas", 4.5, "body text"],
  ["stone", "canvas", 4.5, "secondary text, links, nav"],
  ["ink", "surface", 4.5, "card text, error messages"],
  ["on-primary", "primary", 4.5, "primary button"],
  ["on-stone", "stone", 4.5, "secondary button"],
  ["espresso", "gold-pale", 4.5, "Opened badge"],
  ["on-dark", "clay", 4.5, "Expiring badge"],
  ["forest", "sage-pale", 4.5, "Have badge"],
  ["stone", "surface", 4.5, "Missing badge"],
  ["gold", "canvas", 3, "before stat (title size)"],
  ["olive", "canvas", 3, "after stat (title size)"],
];

describe("color contrast", () => {
  it.each(PAIRS)("%s on %s meets %s:1 (%s)", (fg, bg, min) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(min);
  });
});
