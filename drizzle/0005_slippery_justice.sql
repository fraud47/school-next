CREATE TABLE "fee_catalog_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"default_amount" numeric(12, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "fee_catalog_items_name_lower_unique" ON "fee_catalog_items" USING btree (lower("name"));