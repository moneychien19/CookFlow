import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// CLAUDE.md: components reference tokens only. globals.css is where values live.
const RULES: [string, RegExp][] = [
  ["raw hex color", /#[0-9a-fA-F]{3,8}\b/],
  ["px value", /\b\d+(\.\d+)?px\b/],
  ["arbitrary Tailwind value", /\b[a-z-]+-\[[^\]]+\]/],
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .filter((f) => /\.(tsx?|css)$/.test(f) && !/\.test\.tsx?$/.test(f))
    .map((f) => join(dir, f))
    .filter((f) => f !== join("src", "styles", "globals.css"));
}

describe("design lint", () => {
  it.each(sourceFiles("src"))("%s uses tokens only", (file) => {
    const text = readFileSync(file, "utf8");
    const violations = RULES.flatMap(([rule, pattern]) => {
      const match = text.match(pattern);
      return match ? [`${rule}: ${match[0]}`] : [];
    });
    expect(violations).toEqual([]);
  });
});
