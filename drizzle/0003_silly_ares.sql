ALTER TABLE "student_class_enrollments" DROP CONSTRAINT "student_class_enrollments_student_class_unique";--> statement-breakpoint
ALTER TABLE "student_class_enrollments" ADD COLUMN "term_id" integer;--> statement-breakpoint
ALTER TABLE "student_class_enrollments" ADD CONSTRAINT "student_class_enrollments_term_id_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_class_enrollments" ADD CONSTRAINT "student_class_enrollments_student_term_unique" UNIQUE("student_id","term_id");