import { inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SAMPLE_PANTRY } from "@/lib/sample-pantry";
import { createDb, type Db } from "./client";
import { ingredients } from "./schema";

// Runs against a real Postgres with the recipe catalog loaded, only when TEST_DATABASE_URL is set.
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("SAMPLE_PANTRY against the ingredient catalog (real Postgres)", () => {
  // Connect in beforeAll, not here: the describe body still runs when the suite is skipped.
  let db: Db;
  beforeAll(() => {
    db = createDb(url ?? "");
  });
  afterAll(() => db.$client.end());

  it("names only catalog ingredients, in their canonical unit, none of them staples", async () => {
    const rows = await db
      .select({ name: ingredients.name, unit: ingredients.unit, isStaple: ingredients.isStaple })
      .from(ingredients)
      .where(inArray(ingredients.name, SAMPLE_PANTRY.map((item) => item.name)));
    const catalog = new Map(rows.map((row) => [row.name, row]));

    for (const item of SAMPLE_PANTRY) {
      expect(catalog.get(item.name), item.name).toEqual({ name: item.name, unit: item.unit, isStaple: false });
    }
  });
});
