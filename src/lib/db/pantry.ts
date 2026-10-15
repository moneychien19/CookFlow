import { asc, eq, inArray, sql } from "drizzle-orm";
import { addDays } from "@/lib/dates";
import type { IsoDate, Unit } from "@/lib/planner";
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
    .where(inArray(ingredients.name, items.map((item) => item.name)));
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
