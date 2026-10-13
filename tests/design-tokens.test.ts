import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Reads the token sections of DESIGN.md's YAML front matter. The format is
// regular enough (2-space keys, 4-space typography fields) that a small line
// parser beats adding a YAML dependency.
function designTokens() {
  const frontMatter = readFileSync("DESIGN.md", "utf8").split("\n---\n")[0] ?? "";
  const sections: Record<string, Record<string, string>> = {};
  const typography: Record<string, Record<string, string>> = {};
  let section = "";
  let typeToken = "";
  for (const line of frontMatter.split("\n")) {
    const top = line.match(/^([a-z-]+):\s*$/);
    const entry = line.match(/^ {2}([a-z0-9-]+):\s*"?([^"]*)"?\s*$/);
    const field = line.match(/^ {4}([a-zA-Z]+):\s*(.+)$/);
    if (top?.[1]) {
      section = top[1];
      sections[section] = {};
    } else if (section === "typography" && entry?.[1] && entry[2] === "") {
      typeToken = entry[1];
      typography[typeToken] = {};
    } else if (section === "typography" && field?.[1] && field[2]) {
      typography[typeToken]![field[1]] = field[2];
    } else if (entry?.[1] && entry[2]) {
      sections[section]![entry[1]] = entry[2];
    }
  }
  return { sections, typography };
}

const css = readFileSync("src/styles/globals.css", "utf8");
const { sections, typography } = designTokens();

function cssVar(name: string): string | undefined {
  return css.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1]?.trim();
}

describe("design tokens in globals.css", () => {
  it.each(Object.entries(sections.colors ?? {}))("defines color %s", (name, value) => {
    expect(cssVar(`--color-${name}`)).toBe(value);
  });

  it.each(Object.entries(sections.rounded ?? {}))("defines radius %s", (name, value) => {
    expect(cssVar(`--radius-${name}`)).toBe(value);
  });

  it.each(Object.entries(sections.spacing ?? {}))("defines spacing %s", (name, value) => {
    expect(cssVar(`--spacing-${name}`)).toBe(value);
  });

  it.each(Object.entries(typography))("defines type style %s", (name, style) => {
    expect(cssVar(`--text-${name}`)).toBe(style.fontSize);
    expect(cssVar(`--text-${name}--line-height`)).toBe(style.lineHeight);
    expect(cssVar(`--text-${name}--font-weight`)).toBe(style.fontWeight);
    expect(cssVar(`--text-${name}--letter-spacing`)).toBe(style.letterSpacing);
  });

  it.each(Object.entries(sections.elevation ?? {}))("defines shadow %s", (name, value) => {
    expect(cssVar(`--shadow-${name}`)).toBe(value);
  });

  it.each(Object.entries(sections.layout ?? {}))("defines layout token %s", (name, value) => {
    expect(cssVar(`--${name}`)).toBe(value);
  });

  it("reads every token group from DESIGN.md", () => {
    expect(Object.keys(sections.colors ?? {})).toContain("canvas");
    expect(Object.keys(typography)).toContain("eyebrow");
    expect(Object.keys(sections.rounded ?? {})).toContain("full");
    expect(Object.keys(sections.spacing ?? {})).toContain("md");
    expect(Object.keys(sections.elevation ?? {})).toContain("soft");
    expect(Object.keys(sections.layout ?? {})).toContain("container-page");
  });
});
