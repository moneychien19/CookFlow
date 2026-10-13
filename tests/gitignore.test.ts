import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

function isIgnored(path: string): boolean {
  try {
    execFileSync("git", ["check-ignore", "--quiet", "--no-index", path]);
    return true;
  } catch {
    return false;
  }
}

describe(".gitignore", () => {
  it("ignores local env files that may hold secrets", () => {
    expect(isIgnored(".env")).toBe(true);
    expect(isIgnored(".env.local")).toBe(true);
    expect(isIgnored(".env.production.local")).toBe(true);
  });

  it("keeps .env.example tracked", () => {
    expect(isIgnored(".env.example")).toBe(false);
  });
});
