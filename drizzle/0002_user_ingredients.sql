ALTER TABLE "ingredients" DROP CONSTRAINT "ingredients_name_unique";--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "owner_id" text;--> statement-breakpoint
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ingredients_catalog_name_unique" ON "ingredients" USING btree ("name") WHERE "ingredients"."owner_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "ingredients_owner_name_unique" ON "ingredients" USING btree ("owner_id","name") WHERE "ingredients"."owner_id" is not null;