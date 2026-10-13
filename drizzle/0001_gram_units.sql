ALTER TABLE "ingredients" DROP CONSTRAINT "ingredients_unit_check";--> statement-breakpoint
ALTER TABLE "pantry_items" ALTER COLUMN "quantity" SET DATA TYPE numeric(8, 2);--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ALTER COLUMN "quantity" SET DATA TYPE numeric(8, 2);--> statement-breakpoint
ALTER TABLE "pantry_items" ADD COLUMN "opened" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_unit_check" CHECK ("ingredients"."unit" in ('whole', 'pack', 'bunch', 'clove', 'count', 'g', 'ml'));