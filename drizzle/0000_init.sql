CREATE TABLE "accounts" (
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "ingredients" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"unit" text NOT NULL,
	"is_staple" boolean DEFAULT false NOT NULL,
	CONSTRAINT "ingredients_name_unique" UNIQUE("name"),
	CONSTRAINT "ingredients_unit_check" CHECK ("ingredients"."unit" in ('whole', 'pack', 'bunch', 'clove', 'count'))
);
--> statement-breakpoint
CREATE TABLE "meal_plan_items" (
	"plan_id" integer NOT NULL,
	"position" integer NOT NULL,
	"recipe_id" integer NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"cooked_at" timestamp with time zone,
	CONSTRAINT "meal_plan_items_plan_id_position_pk" PRIMARY KEY("plan_id","position"),
	CONSTRAINT "meal_plan_items_status_check" CHECK ("meal_plan_items"."status" in ('planned', 'cooked', 'skipped'))
);
--> statement-breakpoint
CREATE TABLE "meal_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"leftovers_before" integer NOT NULL,
	"leftovers_after" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pantry_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"ingredient_id" integer NOT NULL,
	"quantity" numeric(6, 2) NOT NULL,
	"expires_on" date,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pantry_items_user_ingredient_unique" UNIQUE("user_id","ingredient_id"),
	CONSTRAINT "pantry_items_quantity_positive" CHECK ("pantry_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "recipe_ingredients" (
	"recipe_id" integer NOT NULL,
	"ingredient_id" integer NOT NULL,
	"quantity" numeric(6, 2) NOT NULL,
	"source_name" text NOT NULL,
	"source_measure" text NOT NULL,
	CONSTRAINT "recipe_ingredients_recipe_id_ingredient_id_pk" PRIMARY KEY("recipe_id","ingredient_id")
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"source" text NOT NULL,
	"source_id" text NOT NULL,
	"image_url" text,
	"instructions" text NOT NULL,
	"servings" integer,
	"tags" text[] DEFAULT '{}'::text[] NOT NULL,
	CONSTRAINT "recipes_source_unique" UNIQUE("source","source_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"email_verified" timestamp,
	"image" text,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_plan_items" ADD CONSTRAINT "meal_plan_items_plan_id_meal_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."meal_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_plan_items" ADD CONSTRAINT "meal_plan_items_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pantry_items" ADD CONSTRAINT "pantry_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pantry_items" ADD CONSTRAINT "pantry_items_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "meal_plans_user_id_idx" ON "meal_plans" USING btree ("user_id","created_at");