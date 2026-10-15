import { and, asc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { addDays } from "@/lib/dates";
import { type IsoDate, type Unit, WEIGHED_UNITS } from "@/lib/planner";
import type { SampleItem } from "@/lib/sample-pantry";
import type { Db } from "./client";
import { ingredients, pantryItems } from "./schema";

export type PantryRow = {
  id: number;
  ingredientId: number;
  name: string;
  unit: Unit;
  isStaple: boolean;
  quantity: number;
  expiresOn: IsoDate | null;
  opened: boolean;
};

/** The user's pantry, soonest expiry first, then undated items, each group by name. */
export async function listPantry(db: Db, userId: string): Promise<PantryRow[]> {
  return db
    .select({
      id: pantryItems.id,
      ingredientId: pantryItems.ingredientId,
      name: ingredients.name,
      unit: ingredients.unit,
      isStaple: ingredients.isStaple,
      quantity: pantryItems.quantity,
      expiresOn: pantryItems.expiresOn,
      opened: pantryItems.opened,
    })
    .from(pantryItems)
    .innerJoin(ingredients, eq(ingredients.id, pantryItems.ingredientId))
    .where(eq(pantryItems.userId, userId))
    .orderBy(sql`${pantryItems.expiresOn} asc nulls last`, asc(ingredients.name));
}

/**
 * Replaces the user's whole pantry with `items` (so it doubles as the demo reset).
 * Every item must match a catalog ingredient in the same unit; otherwise nothing changes.
 */
export async function replacePantryWithSample(
  db: Db,
  userId: string,
  items: readonly SampleItem[],
  today: IsoDate,
): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  const catalog = await db
    .select({ id: ingredients.id, name: ingredients.name, unit: ingredients.unit })
    .from(ingredients)
    .where(and(isNull(ingredients.ownerId), inArray(ingredients.name, items.map((item) => item.name))));
  const byName = new Map(catalog.map((row) => [row.name, row]));

  const problems: string[] = [];
  const rows: (typeof pantryItems.$inferInsert)[] = [];
  for (const item of items) {
    const row = byName.get(item.name);
    if (!row) problems.push(`"${item.name}" is missing`);
    else if (row.unit !== item.unit) problems.push(`"${item.name}" is ${row.unit}, not ${item.unit}`);
    else
      rows.push({
        userId,
        ingredientId: row.id,
        quantity: Math.round(item.quantity * 100) / 100,
        expiresOn: item.expiresInDays === null ? null : addDays(today, item.expiresInDays),
        opened: item.opened,
      });
  }
  if (problems.length > 0) {
    return { ok: false, error: `Sample pantry doesn't match the ingredient catalog: ${problems.join("; ")}` };
  }

  await db.transaction(async (tx) => {
    await tx.delete(pantryItems).where(eq(pantryItems.userId, userId));
    if (rows.length > 0) await tx.insert(pantryItems).values(rows);
  });
  return { ok: true, count: rows.length };
}

export type IngredientOption = { id: number; name: string; unit: Unit; custom: boolean };

/** What the add form offers: the catalog's non-staples (the planner ignores staples) and the user's own ingredients. */
export async function listIngredientOptions(db: Db, userId: string): Promise<IngredientOption[]> {
  const rows = await db
    .select({ id: ingredients.id, name: ingredients.name, unit: ingredients.unit, ownerId: ingredients.ownerId })
    .from(ingredients)
    .where(
      or(
        and(isNull(ingredients.ownerId), eq(ingredients.isStaple, false)),
        eq(ingredients.ownerId, userId),
      ),
    )
    .orderBy(asc(ingredients.name));
  return rows.map(({ ownerId, ...row }) => ({ ...row, custom: ownerId !== null }));
}

type ItemFields = { quantity: number; expiresOn: IsoDate | null; opened: boolean };
export type WriteResult = { ok: true } | { ok: false; error: string };

/** An ingredient picked from the list, or a new one the cook typed (name already lowercased). */
export type IngredientChoice = { kind: "existing"; id: number } | { kind: "new"; name: string; unit: Unit };

const NOT_YOURS: WriteResult = { ok: false, error: "That item isn't in your pantry" };

/** Only g/ml items carry the opened flag; counted items are opened when 0 < qty < 1 (SPEC §3). */
const openedFlag = (unit: Unit, opened: boolean) => opened && WEIGHED_UNITS.has(unit);

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/**
 * The ingredient row to add to. A picked id must be a catalog non-staple or the
 * user's own; a typed name reuses the user's own ingredient of that name, or creates it.
 */
async function resolveIngredient(
  tx: Tx,
  userId: string,
  choice: IngredientChoice,
): Promise<{ ok: true; id: number; unit: Unit } | { ok: false; error: string }> {
  if (choice.kind === "existing") {
    const [row] = await tx
      .select({ id: ingredients.id, unit: ingredients.unit })
      .from(ingredients)
      .where(
        and(
          eq(ingredients.id, choice.id),
          or(and(isNull(ingredients.ownerId), eq(ingredients.isStaple, false)), eq(ingredients.ownerId, userId)),
        ),
      );
    return row ? { ok: true, ...row } : { ok: false, error: "Pick an ingredient from the list" };
  }

  const [match] = await tx
    .select({ id: ingredients.id, unit: ingredients.unit, ownerId: ingredients.ownerId })
    .from(ingredients)
    .where(and(eq(ingredients.name, choice.name), or(isNull(ingredients.ownerId), eq(ingredients.ownerId, userId))));
  if (match?.ownerId === null) return { ok: false, error: `"${choice.name}" is already in the list: pick it there` };
  if (match && match.unit !== choice.unit) {
    return { ok: false, error: `You already have "${choice.name}", measured in ${match.unit}` };
  }
  if (match) return { ok: true, id: match.id, unit: match.unit };

  const [created] = await tx
    .insert(ingredients)
    .values({ name: choice.name, unit: choice.unit, ownerId: userId })
    .returning({ id: ingredients.id, unit: ingredients.unit });
  if (!created) throw new Error("insert returned no row");
  return { ok: true, ...created };
}

/**
 * Adds an item. If the ingredient is already in the pantry, the amounts add up,
 * the earlier expiry date wins, and it stays opened if either one was.
 */
export async function addPantryItem(
  db: Db,
  userId: string,
  input: ItemFields & { ingredient: IngredientChoice },
): Promise<WriteResult> {
  return db.transaction(async (tx) => {
    const ingredient = await resolveIngredient(tx, userId, input.ingredient);
    if (!ingredient.ok) return ingredient;

    await tx
      .insert(pantryItems)
      .values({
        userId,
        ingredientId: ingredient.id,
        quantity: input.quantity,
        expiresOn: input.expiresOn,
        opened: openedFlag(ingredient.unit, input.opened),
      })
      .onConflictDoUpdate({
        target: [pantryItems.userId, pantryItems.ingredientId],
        set: {
          // Capped at the column's maximum; LEAST ignores a NULL expiry, so a date always beats none.
          quantity: sql`least(${pantryItems.quantity} + excluded.quantity, 999999.99)`,
          expiresOn: sql`least(${pantryItems.expiresOn}, excluded.expires_on)`,
          opened: sql`${pantryItems.opened} or excluded.opened`,
          updatedAt: sql`now()`,
        },
      });
    return { ok: true } as const;
  });
}

/** Sets an item's amount, expiry, and opened flag. Scoped by user: another user's id is "not found". */
export async function editPantryItem(
  db: Db,
  userId: string,
  input: ItemFields & { id: number },
): Promise<WriteResult> {
  const mine = and(eq(pantryItems.id, input.id), eq(pantryItems.userId, userId));
  const [item] = await db
    .select({ unit: ingredients.unit })
    .from(pantryItems)
    .innerJoin(ingredients, eq(ingredients.id, pantryItems.ingredientId))
    .where(mine);
  if (!item) return NOT_YOURS;

  await db
    .update(pantryItems)
    .set({
      quantity: input.quantity,
      expiresOn: input.expiresOn,
      opened: openedFlag(item.unit, input.opened),
      updatedAt: sql`now()`,
    })
    .where(mine);
  return { ok: true };
}

/** Removes an item. Scoped by user: another user's id is "not found". */
export async function deletePantryItem(db: Db, userId: string, id: number): Promise<WriteResult> {
  const deleted = await db
    .delete(pantryItems)
    .where(and(eq(pantryItems.id, id), eq(pantryItems.userId, userId)))
    .returning({ id: pantryItems.id });
  return deleted.length > 0 ? { ok: true } : NOT_YOURS;
}
