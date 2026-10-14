/**
 * The shared demo account (SPEC §7, §7a #8): visitors who choose "Try the demo"
 * act as one seeded user with a fixed id and no personal data. No Next.js or
 * database imports here, so the seed script can use it too.
 */
export const DEMO_USER_ID = "demo";
export const DEMO_COOKIE = "cookflow-demo";
const DEMO_COOKIE_VALUE = "1";

/** The user to act as: the signed-in user, else the demo user if the cookie is set, else nobody. */
export function resolveUserId(input: { sessionUserId: string | null | undefined; demoCookie: string | undefined }): string | null {
  if (input.sessionUserId) return input.sessionUserId;
  return input.demoCookie === DEMO_COOKIE_VALUE ? DEMO_USER_ID : null;
}

export function demoCookieOptions({ secure }: { secure: boolean }) {
  return {
    value: DEMO_COOKIE_VALUE,
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  };
}
