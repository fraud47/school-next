"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { studentActivityPayments } from "@/db/schema";
import { requireAdminSession } from "@/lib/admin";

const methods = ["cash", "bank_transfer", "ecocash", "card", "other"] as const;

function fail(error: string): never {
  redirect(`/admin/payments?tab=activities&error=${error}`);
}

export async function recordStudentActivityPayment(data: FormData) {
  const session = await requireAdminSession();
  const studentIdText = data.get("studentId");
  const activityValue = data.get("activity");
  const descriptionValue = data.get("description");
  const amountValue = data.get("amount");
  const methodValue = data.get("method");
  const dateValue = data.get("receivedAt");
  const studentId = typeof studentIdText === "string" && /^\d+$/.test(studentIdText) ? Number(studentIdText) : NaN;
  const activity = typeof activityValue === "string" ? activityValue.trim() : "";
  const description = typeof descriptionValue === "string" ? descriptionValue.trim() : "";
  const amount = typeof amountValue === "string" ? amountValue.trim() : "";
  const method = typeof methodValue === "string" ? methodValue : "";
  const receivedAt = typeof dateValue === "string" ? dateValue : "";
  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(receivedAt) ? new Date(`${receivedAt}T00:00:00.000Z`) : null;
  const amountNumber = Number(amount);
  if (!Number.isSafeInteger(studentId) || studentId < 1 || !activity || activity.length > 120 || description.length > 240 || !/^\d{1,10}(\.\d{1,2})?$/.test(amount) || !Number.isFinite(amountNumber) || amountNumber <= 0 || amountNumber > 9_999_999_999.99 || !methods.includes(method as typeof methods[number])) fail("invalid-activity-payment");
  if (!parsedDate || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== receivedAt) fail("invalid-payment-date");

  const reference = `ACT-${receivedAt.replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`;
  try {
    await db.insert(studentActivityPayments).values({
      studentId,
      activity,
      description: description || null,
      amount,
      method: method as typeof methods[number],
      reference,
      receivedAt,
      createdBy: Number.isSafeInteger(Number(session.user.id)) ? Number(session.user.id) : null,
    });
  } catch {
    fail("activity-payment-save-failed");
  }
  revalidatePath("/admin/payments");
  revalidatePath("/admin/reports");
  revalidatePath("/admin");
  redirect("/admin/payments?notice=activity-payment-recorded&tab=activities");
}
