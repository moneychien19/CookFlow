import { getTableConfig, type PgTable } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { ingredients, mealPlanItems, mealPlans, pantryItems, recipeIngredients, recipes } from "./schema";

function config(table: PgTable) {
  const c = getTableConfig(table);
  return {
    name: c.name,
    columns: Object.fromEntries(c.columns.map((col) => [col.name, col])),
    // Column lists of every index, unique constraint, and primary key, in order.
    indexed: [
      ...c.indexes.map((i) => i.config.columns.map((col) => ("name" in col ? col.name : ""))),
      ...c.uniqueConstraints.map((u) => u.columns.map((col) => col.name)),
      ...c.primaryKeys.map((p) => p.columns.map((col) => col.name)),
    ],
    checks: c.checks.map((check) => check.name),
  };
}

const startsWith = (columns: (string | undefined)[], first: string) => columns[0] === first;

describe("database schema", () => {
  it("allows one pantry row per user and ingredient", () => {
    expect(config(pantryItems).indexed).toContainEqual(["user_id", "ingredient_id"]);
  });

  it.each([pantryItems, mealPlans])("indexes %# by user_id, since pages filter on it", (table) => {
    expect(config(table).indexed.some((cols) => startsWith(cols, "user_id"))).toBe(true);
  });

  it("stores quantities as numeric(6,2) and reads them back as numbers", () => {
    for (const table of [pantryItems, recipeIngredients]) {
      const quantity = config(table).columns.quantity;
      expect(quantity?.getSQLType()).toBe("numeric(6, 2)");
      expect(quantity?.mapFromDriverValue("0.50")).toBe(0.5);
    }
  });

  it("restricts meal status to planned, cooked, or skipped", () => {
    const status = config(mealPlanItems).columns.status;
    expect(status?.notNull).toBe(true);
    expect(status?.default).toBe("planned");
    expect(config(mealPlanItems).checks).toContain("meal_plan_items_status_check");
  });

  it("restricts ingredient units to the canonical practical units", () => {
    expect(config(ingredients).checks).toContain("ingredients_unit_check");
  });

  it("keeps pantry quantities positive", () => {
    expect(config(pantryItems).checks).toContain("pantry_items_quantity_positive");
  });

  it("identifies recipes by source and source id, so the seed can upsert", () => {
    expect(config(recipes).indexed).toContainEqual(["source", "source_id"]);
  });

  it("keys meal plan items by plan and position", () => {
    expect(config(mealPlanItems).indexed).toContainEqual(["plan_id", "position"]);
  });
});
