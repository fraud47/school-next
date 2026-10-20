"use server";

import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { academicYears, classes, feeCatalogItems, feeTemplateItems, feeTemplates, gradeLevels, invoiceItems, invoices, studentClassEnrollments, students, terms } from "@/db/schema";
import { requireAdminSession } from "@/lib/admin";

function text(data: FormData, key: string) {
  const value = data.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function positiveId(value: string) {
  if (!/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function fail(error: string): never {
  redirect(`/admin/invoices/bulk?error=${error}`);
}

export async function createBulkInvoices(data: FormData) {
  await requireAdminSession();
  const academicYearId = positiveId(text(data, "academicYearId"));
  const termId = positiveId(text(data, "termId"));
  const selectedGrade = text(data, "gradeLevelId");
  const gradeLevelId = selectedGrade ? positiveId(selectedGrade) : null;
  const invoiceDate = text(data, "invoiceDate");
  const dueDate = text(data, "dueDate");
  const notes = text(data, "notes");
  const templateId = text(data, "templateId") ? positiveId(text(data, "templateId")) : null;
  if (!academicYearId || !termId || (selectedGrade && !gradeLevelId) || !validDate(invoiceDate) || !validDate(dueDate) || dueDate < invoiceDate || notes.length > 500 || (text(data, "templateId") && !templateId)) fail("invalid-bulk-invoice");

  const [[year], [term]] = await Promise.all([
    db.select({ id: academicYears.id, name: academicYears.name }).from(academicYears).where(eq(academicYears.id, academicYearId)).limit(1),
    db.select({ id: terms.id, academicYearId: terms.academicYearId, name: terms.name }).from(terms).where(eq(terms.id, termId)).limit(1),
  ]);
  if (!year || !term || term.academicYearId !== year.id) fail("invalid-bulk-invoice");

  let items: { feeTypeId: number; name: string; description: string | null; amount: string }[] = [];
  if (templateId) {
    const [template] = await db.select({ id: feeTemplates.id, academicYearId: feeTemplates.academicYearId, classId: feeTemplates.classId, status: feeTemplates.status })
      .from(feeTemplates).where(eq(feeTemplates.id, templateId)).limit(1);
    if (!template || template.status !== "active" || template.classId || (template.academicYearId && template.academicYearId !== academicYearId)) fail("invalid-bulk-template");
    items = await db.select({ feeTypeId: feeCatalogItems.id, name: feeCatalogItems.name, description: feeCatalogItems.description, amount: feeTemplateItems.amount })
      .from(feeTemplateItems).innerJoin(feeCatalogItems, eq(feeTemplateItems.feeCatalogItemId, feeCatalogItems.id))
      .where(eq(feeTemplateItems.templateId, templateId)).orderBy(asc(feeTemplateItems.id));
  } else {
    const rawIds = data.getAll("feeCatalogItemId");
    if (!rawIds.length || rawIds.length > 30 || rawIds.some((value) => typeof value !== "string" || !/^\d+$/.test(value))) fail("invalid-bulk-fees");
    const ids = rawIds.map((value) => Number(value));
    if (ids.some((id) => !Number.isSafeInteger(id) || id < 1) || new Set(ids).size !== ids.length) fail("invalid-bulk-fees");
    const catalog = await db.select({ id: feeCatalogItems.id, name: feeCatalogItems.name, description: feeCatalogItems.description }).from(feeCatalogItems).where(inArray(feeCatalogItems.id, ids));
    if (catalog.length !== ids.length) fail("invalid-bulk-fees");
    items = [];
    for (const fee of catalog) {
      const value = text(data, `feeAmount_${fee.id}`);
      if (!/^\d{1,10}(\.\d{1,2})?$/.test(value) || Number(value) <= 0) fail("invalid-bulk-fees");
      items.push({ feeTypeId: fee.id, name: fee.name, description: fee.description, amount: Number(value).toFixed(2) });
    }
  }
  if (!items.length || items.some((item) => !/^\d{1,10}(\.\d{1,2})?$/.test(item.amount) || Number(item.amount) <= 0)) fail("invalid-bulk-fees");
  const totalCents = items.reduce((sum, item) => sum + Math.round(Number(item.amount) * 100), 0);
  if (!Number.isSafeInteger(totalCents) || totalCents <= 0 || totalCents > 999_999_999_999) fail("invalid-bulk-fees");
  const invoiceAmount = `${Math.floor(totalCents / 100)}.${String(totalCents % 100).padStart(2, "0")}`;

  const rosterConditions = [eq(studentClassEnrollments.termId, termId), eq(classes.academicYearId, academicYearId)];
  if (gradeLevelId) rosterConditions.push(eq(classes.gradeLevelId, gradeLevelId));
  const roster = await db.selectDistinct({ id: students.id })
    .from(students)
    .innerJoin(studentClassEnrollments, eq(studentClassEnrollments.studentId, students.id))
    .innerJoin(classes, eq(classes.id, studentClassEnrollments.classId))
    .innerJoin(gradeLevels, eq(gradeLevels.id, classes.gradeLevelId))
    .where(and(...rosterConditions))
    .orderBy(asc(students.id));
  if (!roster.length) fail("empty-bulk-roster");
  if (roster.length > 2000) fail("bulk-roster-too-large");

  const bulkTag = randomUUID().slice(0, 7).toUpperCase();
  const yearTag = year.name.replace(/\D/g, "").slice(0, 8) || String(year.id);
  await db.transaction(async (tx) => {
    const createdInvoices = await tx.insert(invoices).values(roster.map((student, index) => ({
      invoiceNumber: `INV-${yearTag}-${bulkTag}-${String(index + 1).padStart(4, "0")}`,
      studentId: student.id,
      termId,
      amount: invoiceAmount,
      dueDate,
      notes: notes || `Bulk invoice · ${year.name} · ${term.name}`,
      status: "pending" as const,
      createdAt: new Date(`${invoiceDate}T12:00:00.000Z`),
    }))).returning({ id: invoices.id });

    const allInvoiceItems = createdInvoices.flatMap((invoice) => items.map((item) => ({
      invoiceId: invoice.id,
      name: item.name,
      description: item.description,
      amount: item.amount,
    })));
    for (let offset = 0; offset < allInvoiceItems.length; offset += 500) {
      await tx.insert(invoiceItems).values(allInvoiceItems.slice(offset, offset + 500));
    }
  });

  revalidatePath("/admin/invoices");
  revalidatePath("/admin/students");
  revalidatePath("/admin/reports");
  revalidatePath("/admin");
  redirect(`/admin/invoices/bulk?created=${roster.length}`);
}
