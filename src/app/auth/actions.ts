"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth, signIn, signOut } from "@/lib/auth";
import { DEMO_COOKIE } from "@/lib/demo";

// Signing in or out ends demo mode (SPEC §7).
async function clearDemo() {
  (await cookies()).delete(DEMO_COOKIE);
}

export async function signInWithGitHub() {
  await clearDemo();
  await signIn("github", { redirectTo: "/pantry" });
}

export async function signInWithGoogle() {
  await clearDemo();
  await signIn("google", { redirectTo: "/pantry" });
}

export async function signOutAndLeaveDemo() {
  await clearDemo();
  if (await auth()) await signOut({ redirectTo: "/" });
  redirect("/");
}
