import { asc, desc, eq, sum } from "drizzle-orm";
import { db } from "@/db";
import { invoices, payments, productSales, products, studentActivityPayments, students, terms } from "@/db/schema";
import { getInvoiceList } from "@/lib/invoice-data";

export async function getPaymentInvoiceOptions() {
  const [invoiceRows, paidRows] = await Promise.all([
    getInvoiceList({}, { limit: 5000, offset: 0 }),
    db.select({ invoiceId: payments.invoiceId, paidAmount: sum(payments.amount).mapWith(String) })
      .from(payments).groupBy(payments.invoiceId),
  ]);
  const totals = new Map(paidRows.map((row) => [row.invoiceId, Number(row.paidAmount) || 0]));
  return invoiceRows
    .filter((invoice) => invoice.status === "pending")
    .map((invoice) => {
      const paidAmount = totals.get(invoice.id) ?? 0;
      const total = Number(invoice.amount) || 0;
      return { ...invoice, paidAmount, balance: Math.max(0, total - paidAmount) };
    })
    .filter((invoice) => invoice.balance > 0);
}

export async function getRecentPayments(limit = 50) {
  return db.select({
    id: payments.id,
    reference: payments.reference,
    amount: payments.amount,
    method: payments.method,
    receivedAt: payments.receivedAt,
    invoiceId: invoices.id,
    invoiceNumber: invoices.invoiceNumber,
    studentId: students.id,
    firstName: students.firstName,
    lastName: students.lastName,
    admissionNumber: students.admissionNumber,
  })
    .from(payments)
    .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
    .innerJoin(students, eq(invoices.studentId, students.id))
    .orderBy(desc(payments.receivedAt), desc(payments.id))
    .limit(limit);
}

export async function getPaymentCenterOptions() {
  const [studentsList, sellableProducts, recentSales, activityRows] = await Promise.all([
    db.select({ id: students.id, firstName: students.firstName, lastName: students.lastName, admissionNumber: students.admissionNumber })
      .from(students).orderBy(asc(students.lastName), asc(students.firstName)),
    db.select({ id: products.id, name: products.name, projectName: products.projectName, unitPrice: products.unitPrice, stock: products.stock })
      .from(products).where(eq(products.active, true)).orderBy(asc(products.name)),
    db.select().from(productSales).orderBy(desc(productSales.soldAt), desc(productSales.id)).limit(50),
    db.select({
      id: studentActivityPayments.id,
      studentId: studentActivityPayments.studentId,
      firstName: students.firstName,
      lastName: students.lastName,
      admissionNumber: students.admissionNumber,
      activity: studentActivityPayments.activity,
      description: studentActivityPayments.description,
      amount: studentActivityPayments.amount,
      method: studentActivityPayments.method,
      reference: studentActivityPayments.reference,
      receivedAt: studentActivityPayments.receivedAt,
    }).from(studentActivityPayments).innerJoin(students, eq(studentActivityPayments.studentId, students.id))
      .orderBy(desc(studentActivityPayments.receivedAt), desc(studentActivityPayments.id)).limit(50),
  ]);
  return { studentsList, sellableProducts: sellableProducts.filter((product) => product.stock > 0), recentSales, activityRows };
}

export async function getPaymentReceipt(paymentId: number) {
  const [receipt] = await db.select({
    id: payments.id,
    reference: payments.reference,
    amount: payments.amount,
    method: payments.method,
    receivedAt: payments.receivedAt,
    invoiceId: invoices.id,
    invoiceNumber: invoices.invoiceNumber,
    invoiceAmount: invoices.amount,
    dueDate: invoices.dueDate,
    studentId: students.id,
    firstName: students.firstName,
    lastName: students.lastName,
    admissionNumber: students.admissionNumber,
    termName: terms.name,
  })
    .from(payments)
    .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
    .innerJoin(students, eq(invoices.studentId, students.id))
    .innerJoin(terms, eq(invoices.termId, terms.id))
    .where(eq(payments.id, paymentId))
    .limit(1);
  if (!receipt) return null;
  const [paymentTotals] = await db.select({ paidAmount: sum(payments.amount).mapWith(String) })
    .from(payments).where(eq(payments.invoiceId, receipt.invoiceId));
  return {
    ...receipt,
    invoicePaidAmount: paymentTotals?.paidAmount ?? "0",
    balance: Math.max(0, Number(receipt.invoiceAmount) - Number(paymentTotals?.paidAmount ?? 0)),
  };
}
