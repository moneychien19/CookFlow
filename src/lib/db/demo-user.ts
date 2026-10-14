import { DEMO_USER_ID } from "@/lib/demo";
import type { Db } from "./client";
import { users } from "./schema";

/** Creates the shared demo user if it's missing. Cheap and idempotent, so "Try the demo" runs it every time. */
export async function ensureDemoUser(db: Db): Promise<void> {
  await db.insert(users).values({ id: DEMO_USER_ID, name: "Demo" }).onConflictDoNothing();
}
