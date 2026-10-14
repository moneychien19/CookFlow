import { cookies } from "next/headers";
import { connection } from "next/server";
import { signOutAndLeaveDemo } from "@/app/auth/actions";
import { auth } from "@/lib/auth";
import { DEMO_COOKIE, DEMO_USER_ID, resolveUserId } from "@/lib/demo";

/** Who you are, and the way out: "Sign out" or "Leave demo". Reads the request, so render it inside <Suspense>. */
export async function AccountStatus() {
  // Request time only: Auth.js uses crypto, which Cache Components won't allow while prerendering.
  await connection();
  const cookieStore = await cookies();
  const session = await auth();
  const userId = resolveUserId({ sessionUserId: session?.user?.id, demoCookie: cookieStore.get(DEMO_COOKIE)?.value });
  if (!userId) return null;

  const isDemo = userId === DEMO_USER_ID;
  return (
    <form action={signOutAndLeaveDemo} className="flex items-center gap-xs text-ui">
      <span className="hidden text-stone tablet:inline">{isDemo ? "Demo" : (session?.user?.name ?? "Signed in")}</span>
      <button type="submit" className="inline-flex min-h-touch items-center px-xs text-stone underline">
        {isDemo ? "Leave demo" : "Sign out"}
      </button>
    </form>
  );
}
