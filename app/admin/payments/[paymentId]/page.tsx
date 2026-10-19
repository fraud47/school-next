import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { notFound } from "next/navigation";
import { ReceiptPrintButton } from "@/components/payments/receipt-print-button";
import { StudentsShell } from "@/components/students/students-shell";
import { requireAdminSession } from "@/lib/admin";
import { getPaymentReceipt } from "@/lib/payment-data";
import { getSchoolSettings } from "@/lib/school-settings";

function money(value: string | number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(Number(value) || 0);
}

function dateTime(value: Date) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(value);
}

export default async function PaymentReceiptPage({ params }: { params: Promise<{ paymentId: string }> }) {
  const [session, route] = await Promise.all([requireAdminSession(), params]);
  if (!/^\d+$/.test(route.paymentId)) notFound();
  const id = Number(route.paymentId);
  if (!Number.isSafeInteger(id) || id < 1) notFound();
  const receipt = await getPaymentReceipt(id);
  if (!receipt) notFound();
  const school = await getSchoolSettings();
  const fullyPaid = Number(receipt.invoicePaidAmount) >= Number(receipt.invoiceAmount);

  return <StudentsShell activeSection="payments" userName={session.user.name}>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden"><div><div className="mb-2 flex items-center gap-2 text-xs text-slate-400"><Link className="hover:text-indigo-700" href="/admin/payments">Payments</Link><ChevronRight className="size-3" /><span className="text-slate-600">{receipt.reference}</span></div><h1 className="text-2xl font-bold tracking-tight text-slate-900">Payment receipt</h1></div><ReceiptPrintButton /></div>
    <article className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
      <header className="flex flex-wrap items-start justify-between gap-5 border-b-2 border-slate-800 pb-6"><div className="flex items-start gap-3">{school.logoData && <img alt="" className="size-14 object-contain" src={school.logoData} />}<div><p className="text-2xl font-bold tracking-tight text-slate-900">{school.name}</p><p className="mt-1 text-sm text-slate-500">Official payment receipt</p>{school.address && <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{school.address}</p>}{school.email && <a className="mt-1 block text-sm text-indigo-700" href={`mailto:${school.email}`}>{school.email}</a>}</div></div><div className="text-right"><p className="text-xs uppercase tracking-wide text-slate-500">Receipt number</p><p className="mt-1 font-mono text-lg font-bold text-indigo-700">{receipt.reference}</p><p className="mt-1 text-xs text-slate-500">{dateTime(receipt.receivedAt)}</p></div></header>
      <section className="grid gap-6 border-b border-slate-200 py-6 sm:grid-cols-2"><div><p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Received from</p><p className="text-lg font-semibold text-slate-900">{receipt.firstName} {receipt.lastName}</p><p className="mt-1 text-sm text-slate-600">Admission number: {receipt.admissionNumber}</p></div><div><p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">Payment details</p><dl className="grid grid-cols-[120px_1fr] gap-y-2 text-sm"><dt className="text-slate-500">Invoice</dt><dd className="font-semibold text-slate-800">{receipt.invoiceNumber}</dd><dt className="text-slate-500">Academic term</dt><dd className="text-slate-700">{receipt.termName}</dd><dt className="text-slate-500">Method</dt><dd className="capitalize text-slate-700">{receipt.method.replaceAll("_", " ")}</dd></dl></div></section>
      <section className="py-6"><div className="flex items-end justify-between gap-4 border-b border-slate-200 pb-3"><span className="text-sm font-semibold text-slate-700">Payment received</span><span className="text-3xl font-bold tabular-nums text-emerald-700">{money(receipt.amount)}</span></div><dl className="ml-auto mt-4 grid max-w-sm grid-cols-[1fr_auto] gap-y-2 text-sm"><dt className="text-slate-500">Invoice total</dt><dd className="text-right">{money(receipt.invoiceAmount)}</dd><dt className="text-slate-500">Total received</dt><dd className="text-right text-emerald-700">{money(receipt.invoicePaidAmount)}</dd><dt className="border-t border-slate-200 pt-2 font-semibold text-slate-700">Remaining invoice balance</dt><dd className="border-t border-slate-200 pt-2 text-right font-bold text-slate-900">{money(receipt.balance)}</dd></dl><p className="mt-5 rounded-lg bg-slate-50 px-4 py-3 text-center text-sm font-semibold text-slate-700">{fullyPaid ? "Invoice paid in full" : "Part payment received · balance remains due"}</p></section>
      <footer className="border-t border-slate-200 pt-4 text-xs text-slate-500">This receipt confirms payment against invoice <strong className="text-slate-700">{receipt.invoiceNumber}</strong>.</footer>
    </article>
  </StudentsShell>;
}
