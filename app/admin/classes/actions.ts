"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { academicYears, classes, gradeLevels, studentClassEnrollments } from "@/db/schema";
import { requireAdminSession } from "@/lib/admin";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function positiveId(raw: string) {
  const parsed = Number(raw);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function refresh() {
  for (const path of ["/admin/classes", "/admin/academic/setup", "/admin/students", "/admin/invoices", "/admin/settings"]) revalidatePath(path);
}

export async function createClass(formData: FormData) {
  await requireAdminSession();
  const name = value(formData, "name");
  const gradeLevelId = positiveId(value(formData, "gradeLevelId"));
  const academicYearId = positiveId(value(formData, "academicYearId"));
  if (!name || name.length > 100 || !gradeLevelId || !academicYearId) redirect("/admin/classes?error=invalid-class");

  const [grade, year] = await Promise.all([
    db.select({ id: gradeLevels.id }).from(gradeLevels).where(eq(gradeLevels.id, gradeLevelId)).limit(1),
    db.select({ id: academicYears.id }).from(academicYears).where(eq(academicYears.id, academicYearId)).limit(1),
  ]);
  if (!grade.length || !year.length) redirect("/admin/classes?error=invalid-class");

  let inserted: { id: number }[];
  try {
    inserted = await db.insert(classes).values({ name, gradeLevelId, academicYearId }).onConflictDoNothing().returning({ id: classes.id });
  } catch {
    redirect("/admin/classes?error=class-save-failed");
  }
  if (!inserted.length) redirect("/admin/classes?error=duplicate-class");
  refresh();
  redirect("/admin/classes?notice=class-created");
}

export async function updateClass(formData: FormData) {
  await requireAdminSession();
  const id = positiveId(value(formData, "id"));
  const name = value(formData, "name");
  const gradeLevelId = positiveId(value(formData, "gradeLevelId"));
  const academicYearId = positiveId(value(formData, "academicYearId"));
  if (!id || !name || name.length > 100 || !gradeLevelId || !academicYearId) redirect("/admin/classes?error=invalid-class");

  const [existing] = await db.select({ id: classes.id, gradeLevelId: classes.gradeLevelId, academicYearId: classes.academicYearId }).from(classes).where(eq(classes.id, id)).limit(1);
  if (!existing) redirect("/admin/classes?error=class-not-found");
  const [grade, year] = await Promise.all([
    db.select({ id: gradeLevels.id }).from(gradeLevels).where(eq(gradeLevels.id, gradeLevelId)).limit(1),
    db.select({ id: academicYears.id }).from(academicYears).where(eq(academicYears.id, academicYearId)).limit(1),
  ]);
  if (!grade.length || !year.length) redirect("/admin/classes?error=invalid-class");
  const enrollment = await db.select({ id: studentClassEnrollments.id }).from(studentClassEnrollments).where(eq(studentClassEnrollments.classId, id)).limit(1);
  if (enrollment.length && (existing.gradeLevelId !== gradeLevelId || existing.academicYearId !== academicYearId)) redirect("/admin/classes?error=class-has-students");

  try {
    await db.update(classes).set({ name, gradeLevelId, academicYearId }).where(eq(classes.id, id));
  } catch {
    redirect("/admin/classes?error=duplicate-class");
  }
  refresh();
  redirect("/admin/classes?notice=class-updated");
}

export async function deleteClass(formData: FormData) {
  await requireAdminSession();
  const id = positiveId(value(formData, "id"));
  if (!id) redirect("/admin/classes?error=invalid-class");
  const enrollment = await db.select({ id: studentClassEnrollments.id }).from(studentClassEnrollments).where(eq(studentClassEnrollments.classId, id)).limit(1);
  if (enrollment.length) redirect("/admin/classes?error=class-has-students");
  try {
    const deleted = await db.delete(classes).where(eq(classes.id, id)).returning({ id: classes.id });
    if (!deleted.length) redirect("/admin/classes?error=class-not-found");
  } catch {
    redirect("/admin/classes?error=class-cannot-delete");
  }
  refresh();
  redirect("/admin/classes?notice=class-deleted");
}
