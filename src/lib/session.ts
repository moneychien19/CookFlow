import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/lib/auth";
import { DEMO_COOKIE, resolveUserId } from "@/lib/demo";

/** The signed-in user's id, or the demo user's if the demo cookie is set, or null. */
export async function currentUserId(): Promise<string | null> {
  // Request time only: Auth.js uses crypto, which Cache Components won't allow while prerendering.
  await connection();
  const cookieStore = await cookies();
  const session = await auth();
  return resolveUserId({ sessionUserId: session?.user?.id, demoCookie: cookieStore.get(DEMO_COOKIE)?.value });
}

/**
 * Every page and Server Action that touches user data calls this and scopes its
 * queries by the result. Never take a user id from the client.
 */
export async function requireUserId(): Promise<string> {
  const userId = await currentUserId();
  if (!userId) redirect("/");
  return userId;
}
