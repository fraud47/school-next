CREATE TYPE "public"."user_role" AS ENUM('parent', 'teacher', 'accountant', 'admin');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "user_role" DEFAULT 'parent' NOT NULL;