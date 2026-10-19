"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { academicYears, classes, gradeLevels, terms } from "@/db/schema";
import { requireAdminSession } from "@/lib/admin";

function readText(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function readId(formData: FormData, name: string) {
  const value = readText(formData, name);
  if (!/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function isValidDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function returnToSetup(notice?: string, error?: string, section?: string): never {
  const params = new URLSearchParams();
  if (notice) params.set("notice", notice);
  if (error) params.set("error", error);
  redirect(`/admin/academic/setup${params.size ? `?${params}` : ""}${section ? `#${section}` : ""}`);
}

function revalidateAcademicOptions() {
  revalidatePath("/admin/academic/setup");
  revalidatePath("/admin/students");
  revalidatePath("/admin/students/new");
  revalidatePath("/admin");
}

export async function createAcademicYear(formData: FormData) {
  await requireAdminSession();

  const name = readText(formData, "name");
  const startDate = readText(formData, "startDate");
  const endDate = readText(formData, "endDate");
  const isCurrent = formData.get("isCurrent") === "on";

  if (!name || !startDate || !endDate) {
    returnToSetup(undefined, "required-fields", "academic-year");
  }
  if (!isValidDate(startDate) || !isValidDate(endDate) || startDate >= endDate) {
    returnToSetup(undefined, "invalid-date-range", "academic-year");
  }

  const insertedYear = await db.transaction(async (tx) => {
    const [year] = await tx
      .insert(academicYears)
      .values({ name, startDate, endDate, isCurrent })
      .onConflictDoNothing({ target: academicYears.name })
      .returning({ id: academicYears.id });

    if (year && isCurrent) {
      await tx
        .update(academicYears)
        .set({ isCurrent: false })
        .where(eq(academicYears.isCurrent, true));
      await tx
        .update(academicYears)
        .set({ isCurrent: true })
        .where(eq(academicYears.id, year.id));
    }

    return year;
  });

  if (!insertedYear) {
    returnToSetup(undefined, "duplicate-academic-year", "academic-year");
  }

  revalidateAcademicOptions();
  returnToSetup("academic-year-created", undefined, "term");
}

export async function createTerm(formData: FormData) {
  await requireAdminSession();

  const academicYearId = readId(formData, "academicYearId");
  const name = readText(formData, "name");
  const startDate = readText(formData, "startDate");
  const endDate = readText(formData, "endDate");

  if (!academicYearId || !name || !startDate || !endDate) {
    returnToSetup(undefined, "required-fields", "term");
  }
  if (!isValidDate(startDate) || !isValidDate(endDate) || startDate >= endDate) {
    returnToSetup(undefined, "invalid-date-range", "term");
  }

  const [year] = await db
    .select({ id: academicYears.id })
    .from(academicYears)
    .where(eq(academicYears.id, academicYearId))
    .limit(1);
  if (!year) returnToSetup(undefined, "invalid-academic-year", "term");

  const [term] = await db
    .insert(terms)
    .values({ academicYearId, name, startDate, endDate })
    .onConflictDoNothing({
      target: [terms.academicYearId, terms.name],
    })
    .returning({ id: terms.id });

  if (!term) returnToSetup(undefined, "duplicate-term", "term");

  revalidateAcademicOptions();
  returnToSetup("term-created", undefined, "grade");
}

export async function createGradeLevel(formData: FormData) {
  await requireAdminSession();

  const name = readText(formData, "name");
  if (!name) returnToSetup(undefined, "required-fields", "grade");

  const [grade] = await db
    .insert(gradeLevels)
    .values({ name })
    .onConflictDoNothing({ target: gradeLevels.name })
    .returning({ id: gradeLevels.id });

  if (!grade) returnToSetup(undefined, "duplicate-grade", "grade");

  revalidateAcademicOptions();
  returnToSetup("grade-created", undefined, "class");
}

export async function createClass(formData: FormData) {
  await requireAdminSession();

  const name = readText(formData, "name");
  const gradeLevelId = readId(formData, "gradeLevelId");
  const academicYearId = readId(formData, "academicYearId");

  if (!name || !gradeLevelId || !academicYearId) {
    returnToSetup(undefined, "required-fields", "class");
  }

  const [matchingGrade, matchingYear] = await Promise.all([
    db.select({ id: gradeLevels.id }).from(gradeLevels).where(eq(gradeLevels.id, gradeLevelId)).limit(1),
    db.select({ id: academicYears.id }).from(academicYears).where(eq(academicYears.id, academicYearId)).limit(1),
  ]);
  if (!matchingGrade[0]) returnToSetup(undefined, "invalid-grade", "class");
  if (!matchingYear[0]) returnToSetup(undefined, "invalid-academic-year", "class");

  const [classRecord] = await db
    .insert(classes)
    .values({ name, gradeLevelId, academicYearId })
    .onConflictDoNothing({
      target: [classes.name, classes.academicYearId],
    })
    .returning({ id: classes.id });

  if (!classRecord) returnToSetup(undefined, "duplicate-class", "class");

  revalidateAcademicOptions();
  returnToSetup("class-created", undefined, "class");
}
