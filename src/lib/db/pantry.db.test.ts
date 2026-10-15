import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { SAMPLE_PANTRY } from "@/lib/sample-pantry";
import { createDb, type Db } from "./client";
import {
  addPantryItem,
  deletePantryItem,
  editPantryItem,
  listIngredientOptions,
  listPantry,
  replacePantryWithSample,
} from "./pantry";
import { ingredients, users } from "./schema";

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

  async function ingredientId(name: string) {
    const [row] = await db.select({ id: ingredients.id }).from(ingredients).where(eq(ingredients.name, name));
    if (!row) throw new Error(`no ingredient ${name}`);
    return row.id;
  }

  it("offers every non-staple ingredient in the picker, by name", async () => {
    const options = await listIngredientOptions(db);
    const names = options.map((o) => o.name);
    expect(names).toContain("chicken breast");
    expect(names).not.toContain("salt");
    expect(names).toEqual([...names].sort());
  });

  it("adds a new item, ignoring the opened box on counted produce", async () => {
    await replacePantryWithSample(db, ALICE, [], TODAY);
    const onion = await ingredientId("onion");
    const result = await addPantryItem(db, ALICE, { ingredientId: onion, quantity: 2, expiresOn: null, opened: true });
    expect(result).toEqual({ ok: true });
    expect(await listPantry(db, ALICE)).toMatchObject([{ name: "onion", quantity: 2, opened: false }]);
  });

  it("adds to an item already in the pantry, keeping the earlier expiry and the opened flag", async () => {
    await replacePantryWithSample(db, ALICE, [], TODAY);
    const bacon = await ingredientId("bacon");
    await addPantryItem(db, ALICE, { ingredientId: bacon, quantity: 150, expiresOn: "2026-10-17", opened: true });
    await addPantryItem(db, ALICE, { ingredientId: bacon, quantity: 200, expiresOn: "2026-10-25", opened: false });
    expect(await listPantry(db, ALICE)).toMatchObject([
      { name: "bacon", quantity: 350, expiresOn: "2026-10-17", opened: true },
    ]);
  });

  it("refuses a staple or an unknown ingredient", async () => {
    const salt = await ingredientId("salt");
    for (const id of [salt, 99999999]) {
      const result = await addPantryItem(db, ALICE, { ingredientId: id, quantity: 1, expiresOn: null, opened: false });
      expect(result).toEqual({ ok: false, error: "Pick an ingredient from the list" });
    }
  });

  it("edits an item's amount, expiry, and opened flag", async () => {
    await replacePantryWithSample(db, ALICE, SAMPLE_PANTRY, TODAY);
    const milk = (await listPantry(db, ALICE)).find((i) => i.name === "milk");
    const result = await editPantryItem(db, ALICE, { id: milk?.id ?? 0, quantity: 250, expiresOn: null, opened: false });
    expect(result).toEqual({ ok: true });
    expect((await listPantry(db, ALICE)).find((i) => i.name === "milk")).toMatchObject({
      quantity: 250,
      expiresOn: null,
      opened: false,
    });
  });

  it("can't edit or delete another user's item, even with its id", async () => {
    await replacePantryWithSample(db, ALICE, SAMPLE_PANTRY, TODAY);
    const target = (await listPantry(db, ALICE))[0];
    const id = target?.id ?? 0;

    expect(await editPantryItem(db, BOB, { id, quantity: 1, expiresOn: null, opened: false })).toEqual({
      ok: false,
      error: "That item isn't in your pantry",
    });
    expect(await deletePantryItem(db, BOB, id)).toEqual({ ok: false, error: "That item isn't in your pantry" });
    expect((await listPantry(db, ALICE))[0]).toEqual(target);
  });

  it("deletes the user's own item", async () => {
    await replacePantryWithSample(db, ALICE, SAMPLE_PANTRY, TODAY);
    const [first] = await listPantry(db, ALICE);
    expect(await deletePantryItem(db, ALICE, first?.id ?? 0)).toEqual({ ok: true });
    expect(await listPantry(db, ALICE)).toHaveLength(SAMPLE_PANTRY.length - 1);
  });
});
