"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_COOKIE, demoCookieOptions } from "@/lib/demo";

/** "Try the demo": act as the shared demo user, no sign-in and no personal data. */
export async function startDemo() {
  const { value, ...options } = demoCookieOptions({ secure: process.env.NODE_ENV === "production" });
  (await cookies()).set(DEMO_COOKIE, value, options);
  redirect("/pantry");
}
