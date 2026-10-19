"use server";

import { randomUUID } from "node:crypto";
import { eq, sum } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { invoices, payments } from "@/db/schema";
import { requireAdminSession } from "@/lib/admin";

const methods = ["cash", "bank_transfer", "ecocash", "card", "other"] as const;

function fail(error: string): never {
  redirect(`/admin/payments?error=${error}`);
}

export async function recordPayment(formData: FormData) {
  await requireAdminSession();
  const invoiceValue = formData.get("invoiceId");
  const amountValue = formData.get("amount");
  const methodValue = formData.get("method");
  const receivedDate = formData.get("receivedDate");
  const invoiceId = typeof invoiceValue === "string" && /^\d+$/.test(invoiceValue) ? Number(invoiceValue) : NaN;
  const amountString = typeof amountValue === "string" ? amountValue.trim() : "";
  const method = typeof methodValue === "string" ? methodValue : "";
  const dateString = typeof receivedDate === "string" ? receivedDate : "";
  if (!Number.isSafeInteger(invoiceId) || invoiceId < 1 || !/^\d{1,10}(\.\d{1,2})?$/.test(amountString) || !methods.includes(method as typeof methods[number])) fail("invalid-payment");
  const parsedDate = /^\d{4}-\d{2}-\d{2}$/.test(dateString) ? new Date(`${dateString}T00:00:00.000Z`) : null;
  if (!parsedDate || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== dateString) fail("invalid-payment-date");
  const centsFrom = (value: string) => {
    const [whole, fraction = ""] = value.split(".");
    return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  };
  const amountCents = centsFrom(amountString);
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) fail("invalid-payment");

  const paymentId = await db.transaction(async (tx) => {
    const [invoice] = await tx.select({ id: invoices.id, amount: invoices.amount, status: invoices.status })
      .from(invoices).where(eq(invoices.id, invoiceId)).for("update").limit(1);
    if (!invoice || invoice.status === "cancelled") fail("invalid-payment-invoice");
    if (invoice.status === "paid") fail("invoice-already-paid");
    const [totals] = await tx.select({ paidAmount: sum(payments.amount).mapWith(String) })
      .from(payments).where(eq(payments.invoiceId, invoiceId));
    const paidCents = centsFrom(totals?.paidAmount ?? "0");
    const invoiceCents = centsFrom(invoice.amount);
    if (amountCents > invoiceCents - paidCents) fail("payment-exceeds-balance");
    const reference = `RCP-${dateString.replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const [payment] = await tx.insert(payments).values({
      invoiceId,
      amount: `${Math.floor(amountCents / 100)}.${String(amountCents % 100).padStart(2, "0")}`,
      method: method as typeof methods[number],
      reference,
      receivedAt: new Date(`${dateString}T12:00:00.000Z`),
    }).returning({ id: payments.id });
    await tx.update(invoices).set({ status: paidCents + amountCents >= invoiceCents ? "paid" : "pending" }).where(eq(invoices.id, invoiceId));
    return payment.id;
  });

  revalidatePath("/admin/payments");
  revalidatePath("/admin/invoices");
  revalidatePath(`/admin/invoices/${invoiceId}`);
  revalidatePath("/admin/reports");
  redirect(`/admin/payments/${paymentId}`);
}
