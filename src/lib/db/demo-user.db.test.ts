import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DEMO_USER_ID } from "@/lib/demo";
import { createDb, type Db } from "./client";
import { ensureDemoUser } from "./demo-user";
import { users } from "./schema";

// Runs against a real Postgres (a Neon dev branch), only when TEST_DATABASE_URL is set.
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("ensureDemoUser (real Postgres)", () => {
  // Connect in beforeAll, not here: the describe body still runs when the suite is skipped.
  let db: Db;
  beforeAll(() => {
    db = createDb(url ?? "");
  });
  afterAll(() => db.$client.end());

  it("creates the shared demo user with no personal data", async () => {
    await ensureDemoUser(db);
    const [demo] = await db.select().from(users).where(eq(users.id, DEMO_USER_ID));
    expect(demo).toMatchObject({ id: DEMO_USER_ID, name: "Demo", email: null, image: null });
  });

  it("is safe to call on every visit", async () => {
    await ensureDemoUser(db);
    await ensureDemoUser(db);
    const rows = await db.select().from(users).where(eq(users.id, DEMO_USER_ID));
    expect(rows).toHaveLength(1);
  });
});
