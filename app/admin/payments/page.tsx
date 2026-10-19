import Link from "next/link";
import { ArrowRight, CreditCard, ReceiptText } from "lucide-react";
import { PaymentCaptureForm } from "@/components/payments/payment-capture-form";
import { StudentFeedback } from "@/components/students/student-feedback";
import { StudentsShell } from "@/components/students/students-shell";
import { requireAdminSession } from "@/lib/admin";
import { getPaymentInvoiceOptions, getRecentPayments } from "@/lib/payment-data";

function money(value: string | number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(Number(value) || 0);
}

function dateLabel(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(date);
}

function methodLabel(method: string) {
  return method.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [session, params, invoices, recentPayments] = await Promise.all([
    requireAdminSession(),
    searchParams,
    getPaymentInvoiceOptions(),
    getRecentPayments(30),
  ]);
  const receivedDate = new Date().toISOString().slice(0, 10);

  return <StudentsShell activeSection="payments" userName={session.user.name}>
    <div className="mb-5"><div className="mb-2 flex items-center gap-2 text-xs text-slate-400"><Link className="hover:text-indigo-700" href="/admin">Dashboard</Link><span>›</span><span className="text-slate-600">Payments</span></div><p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-600">Receipting</p><h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Record a payment</h1><p className="mt-1 text-sm text-slate-500">Receive full or partial payment against a student invoice and issue a receipt.</p></div>
    <StudentFeedback error={params.error} />
    <PaymentCaptureForm invoices={invoices} receivedDate={receivedDate} />

    <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 sm:p-5"><div><h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><ReceiptText className="size-4 text-indigo-600" />Recent receipts</h2><p className="mt-1 text-xs text-slate-500">Latest recorded invoice payments.</p></div><span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-semibold text-indigo-700"><CreditCard className="size-3" />{recentPayments.length} records</span></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Receipt</th><th className="px-4 py-3">Student</th><th className="px-4 py-3">Invoice</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Method</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3" /></tr></thead><tbody className="divide-y divide-slate-100">{recentPayments.map((payment) => <tr key={payment.id}><td className="px-4 py-3 font-mono text-xs font-medium text-indigo-700">{payment.reference}</td><td className="px-4 py-3"><Link className="font-medium text-slate-800 hover:text-indigo-700" href={`/admin/students/${payment.studentId}`}>{payment.firstName} {payment.lastName}</Link><span className="block text-[10px] text-slate-400">{payment.admissionNumber}</span></td><td className="px-4 py-3 text-xs text-slate-600">{payment.invoiceNumber}</td><td className="px-4 py-3 text-xs text-slate-500">{dateLabel(payment.receivedAt)}</td><td className="px-4 py-3 text-xs capitalize text-slate-600">{methodLabel(payment.method)}</td><td className="px-4 py-3 text-right font-semibold text-slate-800">{money(payment.amount)}</td><td className="px-4 py-3 text-right"><Link aria-label={`View receipt ${payment.reference}`} className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800" href={`/admin/payments/${payment.id}`}>Receipt<ArrowRight className="size-3" /></Link></td></tr>)}{!recentPayments.length && <tr><td className="px-4 py-10 text-center text-sm text-slate-500" colSpan={7}>No payments have been recorded yet.</td></tr>}</tbody></table></div>
    </section>
  </StudentsShell>;
}
