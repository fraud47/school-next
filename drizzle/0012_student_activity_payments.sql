CREATE TABLE "student_activity_payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"student_id" integer NOT NULL,
	"activity" text NOT NULL,
	"description" text,
	"amount" numeric(12, 2) NOT NULL,
	"method" "payment_method" NOT NULL,
	"reference" text NOT NULL,
	"received_at" date NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "student_activity_payments_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
ALTER TABLE "student_activity_payments" ADD CONSTRAINT "student_activity_payments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_activity_payments" ADD CONSTRAINT "student_activity_payments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;