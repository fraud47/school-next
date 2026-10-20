"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { expenses } from "@/db/schema";
import { requireAdminSession } from "@/lib/admin";

const paymentMethods = ["cash", "bank_transfer", "ecocash", "card", "other"] as const;

function field(data: FormData, name: string) {
  const value = data.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function fail(error: string): never {
  redirect(`/admin/expenses?error=${error}`);
}

export async function recordExpense(data: FormData) {
  const session = await requireAdminSession();
  const expenseDate = field(data, "expenseDate");
  const category = field(data, "category");
  const description = field(data, "description");
  const vendor = field(data, "vendor");
  const amountText = field(data, "amount");
  const method = field(data, "method");
  const reference = field(data, "reference");

  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(expenseDate) ? new Date(`${expenseDate}T00:00:00.000Z`) : null;
  const validDate = parsedDate && !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === expenseDate;
  if (!validDate || !category || category.length > 60 || !description || description.length > 240 || vendor.length > 120 || reference.length > 100 || !/^\d{1,10}(\.\d{1,2})?$/.test(amountText) || !paymentMethods.includes(method as typeof paymentMethods[number])) fail("invalid-expense");

  const amount = Number(amountText);
  if (!Number.isFinite(amount) || amount <= 0) fail("invalid-expense");
  const createdBy = Number(session.user.id);
  await db.insert(expenses).values({
    expenseDate,
    category,
    description,
    vendor: vendor || null,
    amount: amount.toFixed(2),
    method: method as typeof paymentMethods[number],
    reference: reference || null,
    createdBy: Number.isSafeInteger(createdBy) && createdBy > 0 ? createdBy : null,
  });

  revalidatePath("/admin/expenses");
  revalidatePath("/admin/reports");
  redirect("/admin/expenses?notice=expense-recorded");
}
