import { describe, expect, it } from "vitest";
import { DEMO_COOKIE, DEMO_USER_ID, demoCookieOptions, resolveUserId } from "./demo";

describe("resolveUserId", () => {
  it("uses the signed-in user", () => {
    expect(resolveUserId({ sessionUserId: "user-1", demoCookie: undefined })).toBe("user-1");
  });

  it("prefers the signed-in user over a leftover demo cookie", () => {
    expect(resolveUserId({ sessionUserId: "user-1", demoCookie: "1" })).toBe("user-1");
  });

  it("acts as the shared demo user when only the demo cookie is set", () => {
    expect(resolveUserId({ sessionUserId: null, demoCookie: "1" })).toBe(DEMO_USER_ID);
  });

  it("returns nobody without a session or the demo cookie", () => {
    expect(resolveUserId({ sessionUserId: undefined, demoCookie: undefined })).toBeNull();
  });

  it("ignores a demo cookie with any other value", () => {
    expect(resolveUserId({ sessionUserId: null, demoCookie: "admin" })).toBeNull();
  });
});

describe("demoCookieOptions", () => {
  it("keeps the cookie away from scripts and other sites", () => {
    expect(demoCookieOptions({ secure: true })).toMatchObject({ httpOnly: true, sameSite: "lax", secure: true, path: "/" });
  });

  it("drops the secure flag on plain-HTTP localhost", () => {
    expect(demoCookieOptions({ secure: false }).secure).toBe(false);
  });

  it("has a stable, app-specific name", () => {
    expect(DEMO_COOKIE).toBe("cookflow-demo");
  });
});
