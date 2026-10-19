CREATE TYPE "public"."fee_template_status" AS ENUM('active', 'draft');--> statement-breakpoint
CREATE TABLE "fee_template_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" integer NOT NULL,
	"fee_catalog_item_id" integer NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	CONSTRAINT "fee_template_items_template_fee_unique" UNIQUE("template_id","fee_catalog_item_id")
);
--> statement-breakpoint
CREATE TABLE "fee_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"academic_year_id" integer,
	"class_id" integer,
	"status" "fee_template_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fee_template_items" ADD CONSTRAINT "fee_template_items_template_id_fee_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."fee_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_template_items" ADD CONSTRAINT "fee_template_items_fee_catalog_item_id_fee_catalog_items_id_fk" FOREIGN KEY ("fee_catalog_item_id") REFERENCES "public"."fee_catalog_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_templates" ADD CONSTRAINT "fee_templates_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_templates" ADD CONSTRAINT "fee_templates_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE set null ON UPDATE no action;