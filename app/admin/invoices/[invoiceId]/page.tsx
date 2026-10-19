import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { notFound } from "next/navigation";
import { InvoicePrintButton } from "@/components/invoices/invoice-print-button";
import QRCode from "qrcode";
import { StudentsShell } from "@/components/students/students-shell";
import { requireAdminSession } from "@/lib/admin";
import { getInvoiceDetails } from "@/lib/invoice-data";
import { getSchoolSettings } from "@/lib/school-settings";

function money(value: string | number | null) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

function dateLabel(value: Date | string) {
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00.000Z`);
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(date);
}

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const [session, routeParams] = await Promise.all([requireAdminSession(), params]);
  if (!/^\d+$/.test(routeParams.invoiceId)) notFound();
  const invoiceId = Number(routeParams.invoiceId);
  if (!Number.isSafeInteger(invoiceId) || invoiceId < 1) notFound();

  const invoice = await getInvoiceDetails(invoiceId);
  if (!invoice) notFound();
  const school = await getSchoolSettings();

  const paidToDate = Number(invoice.paidAmount) > 0
    ? Number(invoice.paidAmount)
    : invoice.status === "paid" ? Number(invoice.amount) : 0;
  const amountDue = invoice.status === "cancelled" ? 0 : Math.max(0, Number(invoice.amount) - paidToDate);
  const displayedStatus = invoice.status === "cancelled" ? "cancelled" : amountDue === 0 ? "paid" : paidToDate > 0 ? "partially paid" : "pending";
  const invoiceQr = await QRCode.toDataURL(JSON.stringify({
    school: school.name,
    invoice: invoice.invoiceNumber,
    amountDue: amountDue.toFixed(2),
    currency: "USD",
    email: school.email,
  }), { width: 180, margin: 1, errorCorrectionLevel: "M" });

  return (
    <StudentsShell activeSection="invoices" userName={session.user.name}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
            <Link className="hover:text-indigo-700" href="/admin/invoices">Invoices</Link>
            <ChevronRight className="size-3" />
            <span className="text-slate-600">{invoice.invoiceNumber}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Invoice</h1>
        </div>
        <InvoicePrintButton />
      </div>

      <article className="mx-auto max-w-4xl border border-slate-200 bg-white px-6 py-8 shadow-sm sm:px-10 sm:py-10 print:max-w-none print:border-0 print:p-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-3">{school.logoData && <img alt="" className="size-14 object-contain" src={school.logoData} />}<div><p className="text-xl font-bold uppercase tracking-wide text-slate-900">{school.name}</p><p className="mt-1 text-sm text-slate-500">Student billing</p></div></div>
            {school.address && <p className="mt-3 whitespace-pre-line text-sm text-slate-600">{school.address}</p>}
            {school.email && <a className="mt-1 block text-sm text-indigo-700" href={`mailto:${school.email}`}>{school.email}</a>}
          </div>
          <div className="min-w-44 border border-slate-400">
            <div className="bg-emerald-700 px-4 py-2 text-center text-sm font-bold uppercase tracking-wider text-white">Fees invoice</div>
            <div className="grid grid-cols-2 divide-x divide-slate-300 text-center text-sm">
              <div className="p-2"><span className="block text-xs text-slate-500">Academic year</span><strong>{invoice.academicYearName}</strong></div>
              <div className="p-2"><span className="block text-xs text-slate-500">Term</span><strong>{invoice.termName}</strong></div>
            </div>
          </div>
        </header>

        <section className="grid gap-6 border-b border-slate-300 py-6 sm:grid-cols-2">
          <div>
            <h2 className="mb-2 border-b border-slate-300 pb-1 text-xs font-bold uppercase tracking-wide text-slate-600">Student information</h2>
            <p className="text-lg font-bold text-slate-900">{invoice.lastName}, {invoice.firstName}</p>
            <dl className="mt-2 grid grid-cols-[120px_1fr] gap-y-1 text-sm">
              <dt className="text-slate-500">Student ID</dt><dd className="font-semibold text-slate-800">{invoice.admissionNumber}</dd>
              <dt className="text-slate-500">Class</dt><dd className="font-medium text-slate-800">{invoice.gradeName ? `${invoice.gradeName} · ${invoice.className}` : "Not assigned"}</dd>
            </dl>
          </div>
          <dl className="grid grid-cols-[120px_1fr] content-start gap-y-2 text-sm sm:justify-self-end">
            <dt className="text-slate-500">Invoice no.</dt><dd className="font-semibold text-slate-900">{invoice.invoiceNumber}</dd>
            <dt className="text-slate-500">Invoice date</dt><dd className="font-medium text-slate-800">{dateLabel(invoice.invoiceDate)}</dd>
            <dt className="text-slate-500">Due date</dt><dd className="font-semibold text-slate-800">{dateLabel(invoice.dueDate)}</dd>
            <dt className="text-slate-500">Status</dt><dd className="font-semibold capitalize text-slate-800">{displayedStatus}</dd>
          </dl>
        </section>

        <div className="py-6">
          <p className="mb-4 text-sm text-slate-700">Fees billed for <strong>{invoice.firstName} {invoice.lastName}</strong>.</p>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-y border-slate-500 bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-700">
                <th className="w-16 px-3 py-2">Qty</th>
                <th className="px-3 py-2">Description</th>
                <th className="w-36 px-3 py-2 text-right">Amount (USD)</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, index) => (
                <tr className="border-b border-slate-300" key={`${item.name}-${index}`}>
                  <td className="px-3 py-3">1</td>
                  <td className="px-3 py-3">
                    <span className="font-medium text-slate-900">{item.name}</span>
                    {item.description && <span className="block pt-0.5 text-xs text-slate-500">{item.description}</span>}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums">{money(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section className="ml-auto max-w-md border-t-2 border-slate-800 pt-3">
          <div className="flex justify-between gap-4 py-1 text-sm">
            <span className="font-semibold text-slate-700">Paid to date</span>
            <span className="font-semibold tabular-nums text-emerald-700">{money(paidToDate)}</span>
          </div>
          <div className="flex justify-between gap-4 py-1 text-sm">
            <span className="font-semibold text-slate-700">Invoice total</span>
            <span className="font-semibold tabular-nums text-slate-900">{money(invoice.amount)}</span>
          </div>
          <div className="mt-2 flex justify-between gap-4 border border-slate-500 bg-slate-100 px-3 py-3">
            <span className="font-bold uppercase text-slate-800">Amount due</span>
            <span className="text-lg font-bold tabular-nums text-slate-900">{money(amountDue)}</span>
          </div>
        </section>

        <section className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-slate-300 pt-5">
          <div><h2 className="text-sm font-semibold text-slate-800">Scan for invoice details</h2><p className="mt-1 max-w-sm text-xs leading-5 text-slate-500">The code contains the invoice number, balance due, currency, and school contact email.</p></div>
          <img alt={`QR code for invoice ${invoice.invoiceNumber}`} className="size-32" height={128} src={invoiceQr} width={128} />
        </section>

        {invoice.notes && (
          <section className="mt-6 border-t border-slate-300 pt-4">
            <h2 className="text-xs font-bold uppercase tracking-wide text-slate-600">Additional notes</h2>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{invoice.notes}</p>
          </section>
        )}

        <footer className="mt-8 border-t border-slate-300 pt-4 text-xs text-slate-500">
          Please use invoice number <strong className="text-slate-700">{invoice.invoiceNumber}</strong> as your payment reference. {school.email && <>Questions? Contact <a className="text-indigo-700" href={`mailto:${school.email}`}>{school.email}</a>.</>}
        </footer>
      </article>
    </StudentsShell>
  );
}
