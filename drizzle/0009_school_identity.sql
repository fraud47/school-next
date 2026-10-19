CREATE TABLE "school_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"name" text DEFAULT 'Your School' NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"logo_data" text,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
