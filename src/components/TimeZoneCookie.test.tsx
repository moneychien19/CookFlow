// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TIME_ZONE_COOKIE } from "@/lib/time-zone";
import { TimeZoneCookie } from "./TimeZoneCookie";

const router = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;

function mount() {
  const host = document.createElement("div");
  const root = createRoot(host);
  act(() => root.render(<TimeZoneCookie />));
  act(() => root.unmount());
}

describe("TimeZoneCookie", () => {
  beforeEach(() => {
    router.refresh.mockClear();
    document.cookie = `${TIME_ZONE_COOKIE}=; max-age=0; path=/`;
  });

  it("stores the browser's time zone and re-renders once so dates use it", () => {
    mount();
    expect(document.cookie).toContain(`${TIME_ZONE_COOKIE}=${encodeURIComponent(zone)}`);
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });

  it("doesn't re-render again when the zone hasn't changed", () => {
    mount();
    mount();
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });

  it("updates the cookie when the cook is in a different zone than before", () => {
    document.cookie = `${TIME_ZONE_COOKIE}=Pacific%2FAuckland; path=/`;
    mount();
    expect(document.cookie).toContain(`${TIME_ZONE_COOKIE}=${encodeURIComponent(zone)}`);
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });
});
