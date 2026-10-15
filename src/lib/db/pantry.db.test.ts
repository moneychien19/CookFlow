import { inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SAMPLE_PANTRY } from "@/lib/sample-pantry";
import { createDb, type Db } from "./client";
import { listPantry, replacePantryWithSample } from "./pantry";
import { users } from "./schema";

// Runs against a real Postgres with the recipe catalog loaded, only when TEST_DATABASE_URL is set.
const url = process.env.TEST_DATABASE_URL;
const ALICE = "test-pantry-alice";
const BOB = "test-pantry-bob";
const TODAY = "2026-10-14";

describe.skipIf(!url)("pantry queries (real Postgres)", () => {
  // Connect in beforeAll, not here: the describe body still runs when the suite is skipped.
  let db: Db;
  beforeAll(async () => {
    db = createDb(url ?? "");
    await db.insert(users).values([{ id: ALICE }, { id: BOB }]).onConflictDoNothing();
  });
  afterAll(async () => {
    // Deleting the users cascades to their pantry rows.
    await db.delete(users).where(inArray(users.id, [ALICE, BOB]));
    await db.$client.end();
  });

  it("loads the sample pantry with expiry dates counted from today", async () => {
    const result = await replacePantryWithSample(db, ALICE, SAMPLE_PANTRY, TODAY);
    expect(result).toEqual({ ok: true, count: SAMPLE_PANTRY.length });

    const items = await listPantry(db, ALICE);
    expect(items).toHaveLength(SAMPLE_PANTRY.length);
    expect(items.find((i) => i.name === "chicken breast")).toMatchObject({
      quantity: 450,
      unit: "g",
      opened: false,
      expiresOn: "2026-10-15",
    });
    expect(items.find((i) => i.name === "bacon")?.opened).toBe(true);
  });

  it("replaces the pantry instead of adding to it when loaded twice", async () => {
    await replacePantryWithSample(db, ALICE, SAMPLE_PANTRY, TODAY);
    await replacePantryWithSample(db, ALICE, SAMPLE_PANTRY.slice(0, 2), TODAY);
    expect(await listPantry(db, ALICE)).toHaveLength(2);
  });

  it("only lists the user's own items", async () => {
    await replacePantryWithSample(db, ALICE, SAMPLE_PANTRY, TODAY);
    await replacePantryWithSample(db, BOB, SAMPLE_PANTRY.slice(0, 1), TODAY);
    expect(await listPantry(db, BOB)).toHaveLength(1);
    expect(await listPantry(db, ALICE)).toHaveLength(SAMPLE_PANTRY.length);
  });

  it("lists items expiring soonest first, then those with no date", async () => {
    await replacePantryWithSample(db, ALICE, SAMPLE_PANTRY, TODAY);
    const dates = (await listPantry(db, ALICE)).map((i) => i.expiresOn);
    const firstUndated = dates.indexOf(null);
    expect(dates[0]).toBe("2026-10-15");
    expect(dates.slice(firstUndated).every((d) => d === null)).toBe(true);
  });

  it("refuses a sample item missing from the catalog or in the wrong unit, and keeps the pantry", async () => {
    await replacePantryWithSample(db, ALICE, SAMPLE_PANTRY, TODAY);
    const result = await replacePantryWithSample(
      db,
      ALICE,
      [
        { name: "dragon fruit", unit: "whole", quantity: 1, opened: false, expiresInDays: null },
        { name: "onion", unit: "g", quantity: 100, opened: false, expiresInDays: null },
      ],
      TODAY,
    );
    expect(result).toEqual({
      ok: false,
      error: 'Sample pantry doesn\'t match the ingredient catalog: "dragon fruit" is missing; "onion" is whole, not g',
    });
    expect(await listPantry(db, ALICE)).toHaveLength(SAMPLE_PANTRY.length);
  });
});
