"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  classes,
  parents,
  studentClassEnrollments,
  studentParents,
  students,
  terms,
} from "@/db/schema";
import { requireAdminSession } from "@/lib/admin";

type EnrollmentSelection = {
  classId: number;
  termId: number;
};

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

function hasPostgresCode(error: unknown, code: string) {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as Error & { code?: unknown }).code === code
  );
}

async function readEnrollmentSelection(formData: FormData) {
  const classValue = readText(formData, "classId");
  const termValue = readText(formData, "termId");
  if (!classValue && !termValue) return { selection: null, valid: true };

  const classId = readId(formData, "classId");
  const termId = readId(formData, "termId");
  if (!classId || !termId) return { selection: null, valid: false };

  const [matchingClass] = await db
    .select({ classId: classes.id })
    .from(classes)
    .innerJoin(terms, eq(classes.academicYearId, terms.academicYearId))
    .where(and(eq(classes.id, classId), eq(terms.id, termId)))
    .limit(1);

  return matchingClass
    ? { selection: { classId, termId } satisfies EnrollmentSelection, valid: true }
    : { selection: null, valid: false };
}

function studentsPath(message: string) {
  return `/admin/students?${message}`;
}

function newStudentPath(message: string) {
  return `/admin/students/new?${message}`;
}

function revalidateStudents(studentId?: number) {
  revalidatePath("/admin/students");
  revalidatePath("/admin");
  if (studentId) revalidatePath(`/admin/students/${studentId}`);
}

export async function createStudent(formData: FormData) {
  await requireAdminSession();

  const firstName = readText(formData, "firstName");
  const lastName = readText(formData, "lastName");
  const admissionNumber = readText(formData, "admissionNumber");
  const dateOfBirth = readText(formData, "dateOfBirth");
  const parentFirstName = readText(formData, "parentFirstName");
  const parentLastName = readText(formData, "parentLastName");
  const parentEmail = readText(formData, "parentEmail");
  const parentPhone = readText(formData, "parentPhone");
  const hasParentDetails = Boolean(parentFirstName || parentLastName || parentEmail || parentPhone);
  const { selection, valid } = await readEnrollmentSelection(formData);

  if (!firstName || !lastName || !admissionNumber) {
    redirect(newStudentPath("error=required-fields"));
  }
  if (hasParentDetails && (!parentFirstName || !parentLastName)) {
    redirect(newStudentPath("error=parent-name-required"));
  }
  if (parentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) {
    redirect(newStudentPath("error=invalid-parent-email"));
  }
  if (dateOfBirth && !isValidDate(dateOfBirth)) {
    redirect(newStudentPath("error=invalid-date"));
  }
  if (!valid) {
    redirect(newStudentPath("error=invalid-enrollment"));
  }

  const studentId = await db.transaction(async (tx) => {
    const [student] = await tx
      .insert(students)
      .values({
        firstName,
        lastName,
        admissionNumber,
        dateOfBirth: dateOfBirth || null,
      })
      .onConflictDoNothing({ target: students.admissionNumber })
      .returning({ id: students.id });

    if (!student) return null;

    if (selection) {
      await tx.insert(studentClassEnrollments).values({
        studentId: student.id,
        classId: selection.classId,
        termId: selection.termId,
      });
    }

    if (hasParentDetails) {
      const [parent] = await tx.insert(parents).values({
        firstName: parentFirstName,
        lastName: parentLastName,
        email: parentEmail || null,
        phone: parentPhone || null,
      }).returning({ id: parents.id });
      if (parent) await tx.insert(studentParents).values({ studentId: student.id, parentId: parent.id });
    }

    return student.id;
  });

  if (!studentId) redirect(newStudentPath("error=duplicate-admission"));

  revalidateStudents(studentId);
  redirect(`/admin/students/${studentId}?notice=created`);
}

export async function updateStudent(formData: FormData) {
  await requireAdminSession();

  const id = readId(formData, "studentId");
  const firstName = readText(formData, "firstName");
  const lastName = readText(formData, "lastName");
  const admissionNumber = readText(formData, "admissionNumber");
  const dateOfBirth = readText(formData, "dateOfBirth");

  if (!id) redirect(studentsPath("error=invalid-student"));
  if (!firstName || !lastName || !admissionNumber) {
    redirect(`/admin/students/${id}?error=required-fields`);
  }
  if (dateOfBirth && !isValidDate(dateOfBirth)) {
    redirect(`/admin/students/${id}?error=invalid-date`);
  }

  try {
    const [updated] = await db
      .update(students)
      .set({
        firstName,
        lastName,
        admissionNumber,
        dateOfBirth: dateOfBirth || null,
      })
      .where(eq(students.id, id))
      .returning({ id: students.id });

    if (!updated) redirect(studentsPath("error=student-not-found"));
  } catch (error) {
    if (hasPostgresCode(error, "23505")) {
      redirect(`/admin/students/${id}?error=duplicate-admission`);
    }
    throw error;
  }

  revalidateStudents(id);
  redirect(`/admin/students/${id}?notice=updated`);
}

export async function assignStudentToClass(formData: FormData) {
  await requireAdminSession();

  const studentId = readId(formData, "studentId");
  const termId = readId(formData, "termId");
  const classId = readId(formData, "classId");

  if (!studentId || !termId || !classId) {
    redirect(studentsPath("error=invalid-enrollment"));
  }

  const { selection, valid } = await readEnrollmentSelection(formData);
  if (!valid || !selection) {
    redirect(`/admin/students/${studentId}?error=invalid-enrollment`);
  }

  const [student] = await db
    .select({ id: students.id })
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1);
  if (!student) redirect(studentsPath("error=student-not-found"));

  await db
    .insert(studentClassEnrollments)
    .values({
      studentId,
      classId: selection.classId,
      termId: selection.termId,
      enrolledAt: new Date().toISOString().slice(0, 10),
    })
    .onConflictDoUpdate({
      target: [studentClassEnrollments.studentId, studentClassEnrollments.termId],
      set: {
        classId: selection.classId,
        enrolledAt: new Date().toISOString().slice(0, 10),
      },
    });

  revalidateStudents(studentId);
  redirect(`/admin/students/${studentId}?notice=assigned`);
}

export async function deleteStudent(formData: FormData) {
  await requireAdminSession();

  const id = readId(formData, "studentId");
  if (!id) redirect(studentsPath("error=invalid-student"));

  try {
    const [deleted] = await db
      .delete(students)
      .where(eq(students.id, id))
      .returning({ id: students.id });

    if (!deleted) redirect(studentsPath("error=student-not-found"));
  } catch (error) {
    if (hasPostgresCode(error, "23503")) {
      redirect(`/admin/students/${id}?error=student-has-invoices`);
    }
    throw error;
  }

  revalidateStudents(id);
  redirect("/admin/students?notice=deleted");
}
