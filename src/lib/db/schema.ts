import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";
import { UNITS, type Unit } from "@/lib/planner/types";

export const MEAL_STATUSES = ["planned", "cooked", "skipped"] as const;
export type MealStatus = (typeof MEAL_STATUSES)[number];


/** `'a', 'b', ...` for an IN (...) check. Values are our own constants, never user input. */
const sqlList = (values: readonly string[]) => sql.raw(values.map((v) => `'${v}'`).join(", "));

/** Quantity in the ingredient's unit: 0.5 onion = 0.50, 300 g of chicken = 300.00. Read back as a number. */
const quantity = () => numeric("quantity", { precision: 8, scale: 2, mode: "number" }).notNull();

// ─── Auth.js (Drizzle adapter). JS property names are what the adapter expects. ───

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

// ─── CookFlow (SPEC §3) ───

export const ingredients = pgTable(
  "ingredients",
  {
    id: serial("id").primaryKey(),
    /** Lowercase: "onion", "egg", "chicken breast". */
    name: text("name").notNull(),
    unit: text("unit").$type<Unit>().notNull(),
    /** Salt, pepper, oil, water: ignored by the planner. */
    isStaple: boolean("is_staple").notNull().default(false),
    /** Null for the shared catalog (written by CookFlow-Ingest); a user id for an ingredient that user added. */
    ownerId: text("owner_id").references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [
    check("ingredients_unit_check", sql`${t.unit} in (${sqlList(UNITS)})`),
    // Names are unique within the catalog, and within each user's own list.
    uniqueIndex("ingredients_catalog_name_unique").on(t.name).where(sql`${t.ownerId} is null`),
    // Also the index for "this user's ingredients" (owner_id is the leading column).
    uniqueIndex("ingredients_owner_name_unique").on(t.ownerId, t.name).where(sql`${t.ownerId} is not null`),
  ],
);

export const pantryItems = pgTable(
  "pantry_items",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ingredientId: integer("ingredient_id")
      .notNull()
      .references(() => ingredients.id),
    quantity: quantity(),
    expiresOn: date("expires_on", { mode: "string" }),
    /** Opened or partly used. Set by the user, and by "mark cooked" when some is left (SPEC §6). */
    opened: boolean("opened").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Also the index for "this user's pantry" (user_id is the leading column).
    unique("pantry_items_user_ingredient_unique").on(t.userId, t.ingredientId),
    check("pantry_items_quantity_positive", sql`${t.quantity} > 0`),
  ],
);

export const recipes = pgTable(
  "recipes",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    /** "themealdb" */
    source: text("source").notNull(),
    sourceId: text("source_id").notNull(),
    imageUrl: text("image_url"),
    /** Exactly as the source wrote it; never truncated (SPEC §7a #10). */
    instructions: text("instructions").notNull(),
    servings: integer("servings"),
    tags: text("tags").array().notNull().default(sql`'{}'::text[]`),
  },
  (t) => [unique("recipes_source_unique").on(t.source, t.sourceId)],
);

export const recipeIngredients = pgTable(
  "recipe_ingredients",
  {
    recipeId: integer("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    ingredientId: integer("ingredient_id")
      .notNull()
      .references(() => ingredients.id),
    /** Canonical quantity, for the planner and "mark cooked" only. */
    quantity: quantity(),
    /** Exactly as the source wrote them; shown on the recipe page (SPEC §7a #9). */
    sourceName: text("source_name").notNull(),
    sourceMeasure: text("source_measure").notNull(),
  },
  (t) => [primaryKey({ columns: [t.recipeId, t.ingredientId] })],
);

export const mealPlans = pgTable(
  "meal_plans",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    /** Count of hard-to-use leftovers, snapshotted when the plan was generated. */
    leftoversBefore: integer("leftovers_before").notNull(),
    leftoversAfter: integer("leftovers_after").notNull(),
  },
  (t) => [index("meal_plans_user_id_idx").on(t.userId, t.createdAt)],
);

export const mealPlanItems = pgTable(
  "meal_plan_items",
  {
    planId: integer("plan_id")
      .notNull()
      .references(() => mealPlans.id, { onDelete: "cascade" }),
    /** 1..N, the order the planner picked the meals. */
    position: integer("position").notNull(),
    recipeId: integer("recipe_id")
      .notNull()
      .references(() => recipes.id),
    status: text("status").$type<MealStatus>().notNull().default("planned"),
    cookedAt: timestamp("cooked_at", { withTimezone: true }),
  },
  (t) => [
    primaryKey({ columns: [t.planId, t.position] }),
    check("meal_plan_items_status_check", sql`${t.status} in (${sqlList(MEAL_STATUSES)})`),
  ],
);
