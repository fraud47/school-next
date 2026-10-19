"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  classes,
  feeCatalogItems,
  invoiceItems,
  invoices,
  studentClassEnrollments,
  students,
  terms,
} from "@/db/schema";
import { requireAdminSession } from "@/lib/admin";

type FeeItem = {
  feeTypeId: number;
  name: string;
  description: string | null;
  cents: number;
};

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function id(formData: FormData, key: string) {
  const value = text(formData, key);
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

async function readFeeItems(formData: FormData): Promise<FeeItem[] | null> {
  const feeTypeIds = formData.getAll("itemFeeTypeId");
  const descriptions = formData.getAll("itemDescription");
  const amounts = formData.getAll("itemAmount");
  if (feeTypeIds.length === 0 || feeTypeIds.length > 30 || feeTypeIds.length !== descriptions.length || feeTypeIds.length !== amounts.length) return null;

  const parsedIds: number[] = [];
  for (const value of feeTypeIds) {
    if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed <= 0) return null;
    parsedIds.push(parsed);
  }
  const feeTypes = await db
    .select({ id: feeCatalogItems.id, name: feeCatalogItems.name })
    .from(feeCatalogItems)
    .where(inArray(feeCatalogItems.id, parsedIds));
  const feeTypesById = new Map(feeTypes.map((feeType) => [feeType.id, feeType]));

  const items: FeeItem[] = [];
  for (let index = 0; index < feeTypeIds.length; index += 1) {
    const feeTypeId = parsedIds[index];
    const rawDescription = descriptions[index];
    const rawAmount = amounts[index];
    if (feeTypeId === null || typeof rawDescription !== "string" || typeof rawAmount !== "string") return null;
    const feeType = feeTypesById.get(feeTypeId);
    if (!feeType) return null;
    const description = rawDescription.trim();
    const amount = rawAmount.trim();
    if (description.length > 240 || !/^\d{1,10}(\.\d{1,2})?$/.test(amount)) return null;

    const [whole, fraction = ""] = amount.split(".");
    const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
    if (!Number.isSafeInteger(cents) || cents <= 0) return null;
    items.push({ feeTypeId, name: feeType.name, description: description || null, cents });
  }

  const totalCents = items.reduce((total, item) => total + item.cents, 0);
  return Number.isSafeInteger(totalCents) && totalCents <= 999_999_999_999 ? items : null;
}

export async function createFeeCatalogItem(nameValue: string, descriptionValue: string, amountValue: string) {
  await requireAdminSession();

  const name = nameValue.trim();
  const description = descriptionValue.trim();
  const amount = amountValue.trim();
  if (!name || name.length > 100 || description.length > 240 || !/^\d{1,10}(\.\d{1,2})?$/.test(amount)) {
    return { ok: false as const, error: "Enter a fee name and a valid amount." };
  }
  const [whole, fraction = ""] = amount.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents) || cents <= 0) {
    return { ok: false as const, error: "The fee amount must be greater than zero." };
  }
  const defaultAmount = `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;

  const [created] = await db
    .insert(feeCatalogItems)
    .values({ name, description: description || null, defaultAmount })
    .onConflictDoNothing()
    .returning({
      id: feeCatalogItems.id,
      name: feeCatalogItems.name,
      description: feeCatalogItems.description,
      defaultAmount: feeCatalogItems.defaultAmount,
    });
  if (created) {
    revalidatePath("/admin/invoices/new");
    revalidatePath("/admin/settings");
    return { ok: true as const, item: created, alreadyExists: false };
  }

  const [existing] = await db
    .select({
      id: feeCatalogItems.id,
      name: feeCatalogItems.name,
      description: feeCatalogItems.description,
      defaultAmount: feeCatalogItems.defaultAmount,
    })
    .from(feeCatalogItems)
    .where(sql`lower(${feeCatalogItems.name}) = lower(${name})`)
    .limit(1);
  if (!existing) throw new Error("Fee item insert conflicted but the existing fee could not be found.");
  return { ok: true as const, item: existing, alreadyExists: true };
}

function redirectToNewInvoice(error: string): never {
  redirect(`/admin/invoices/new?error=${encodeURIComponent(error)}`);
}

function postgresCode(error: unknown): unknown {
  if (!(error instanceof Error)) return undefined;
  if ("code" in error) return (error as Error & { code?: unknown }).code;
  return error.cause ? postgresCode(error.cause) : undefined;
}

export async function createInvoice(formData: FormData) {
  await requireAdminSession();

  const academicYearId = id(formData, "academicYearId");
  const termId = id(formData, "termId");
  const classId = id(formData, "classId");
  const studentId = id(formData, "studentId");
  const invoiceDate = text(formData, "invoiceDate");
  const dueDate = text(formData, "dueDate");
  const invoiceNumber = text(formData, "invoiceNumber");
  const notes = text(formData, "notes");
  const items = await readFeeItems(formData);

  if (notes.length > 500) redirectToNewInvoice("invalid-invoice-notes");
  if (!academicYearId || !termId || !studentId) {
    redirectToNewInvoice("invalid-invoice");
  }
  if (!validDate(invoiceDate) || !validDate(dueDate) || dueDate < invoiceDate) {
    redirectToNewInvoice("invalid-invoice-dates");
  }
  if (!items) redirectToNewInvoice("invalid-invoice-items");

  const [term, student] = await Promise.all([
    db.select({ id: terms.id, academicYearId: terms.academicYearId })
      .from(terms)
      .where(and(eq(terms.id, termId), eq(terms.academicYearId, academicYearId)))
      .limit(1),
    db.select({ id: students.id })
      .from(students)
      .where(eq(students.id, studentId))
      .limit(1),
  ]);
  if (!term[0] || !student[0]) redirectToNewInvoice("invalid-invoice-context");

  if (classId) {
    const [matchingClass] = await db
      .select({ id: classes.id })
      .from(classes)
      .innerJoin(studentClassEnrollments, eq(classes.id, studentClassEnrollments.classId))
      .where(and(
        eq(classes.id, classId),
        eq(classes.academicYearId, academicYearId),
        eq(studentClassEnrollments.studentId, studentId),
        eq(studentClassEnrollments.termId, termId),
      ))
      .limit(1);
    if (!matchingClass) redirectToNewInvoice("invalid-invoice-context");
  }

  const totalCents = items.reduce((total, item) => total + item.cents, 0);
  const amount = `${Math.floor(totalCents / 100)}.${String(totalCents % 100).padStart(2, "0")}`;

  let invoiceId: number;
  try {
    invoiceId = await db.transaction(async (tx) => {
      const [invoice] = await tx
        .insert(invoices)
        .values({
          invoiceNumber: `TEMP-${randomUUID()}`,
          studentId,
          termId,
          amount,
          dueDate,
          notes: notes || null,
          createdAt: new Date(`${invoiceDate}T12:00:00.000Z`),
        })
        .returning({ id: invoices.id });

      await tx.insert(invoiceItems).values(items.map((item) => ({
        invoiceId: invoice.id,
        name: item.name,
        description: item.description,
        amount: `${Math.floor(item.cents / 100)}.${String(item.cents % 100).padStart(2, "0")}`,
      })));

      await tx
        .update(invoices)
        .set({
          invoiceNumber: invoiceNumber || `INV-${invoiceDate.slice(0, 4)}-${String(invoice.id).padStart(6, "0")}`,
        })
        .where(eq(invoices.id, invoice.id));

      return invoice.id;
    });

  } catch (error) {
    if (postgresCode(error) === "23505") redirectToNewInvoice("duplicate-invoice-number");
    throw error;
  }

  revalidatePath("/admin/invoices");
  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/${studentId}`);
  redirect(`/admin/invoices/${invoiceId}`);
}
