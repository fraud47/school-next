import Link from "next/link";
import { ArrowLeft, Banknote, BookOpenText, ChartNoAxesColumn, Clock3, FileBarChart, FileText, ReceiptText, Download, Play } from "lucide-react";
import { StudentsShell } from "@/components/students/students-shell";
import { requireAdminSession } from "@/lib/admin";
import { getInvoiceList } from "@/lib/invoice-data";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { expenses, invoiceItems, invoices, payments, students as studentTable } from "@/db/schema";

const reports = [
  { id: "cashbook", name: "Cashbook", description: "Cash received and paid over a selected period.", icon: Banknote },
  { id: "aging", name: "Aging debtors", description: "Unpaid invoices grouped by age as of a selected date.", icon: Clock3 },
  { id: "invoices", name: "Invoices", description: "Issued invoices, amounts, due dates and status.", icon: FileText },
  { id: "statement", name: "Statement", description: "A student account statement from issued invoices.", icon: ReceiptText },
  { id: "financial", name: "Financial statement", description: "Cash basis fee income, operating expenses and net surplus or deficit.", icon: ChartNoAxesColumn },
] as const;

type Invoice = Awaited<ReturnType<typeof getInvoiceList>>[number];
type PaymentRow = { id: number; invoiceId: number; reference: string; amount: string; method: string; receivedAt: Date; invoiceNumber: string; studentId: number; firstName: string; lastName: string; admissionNumber: string };

function money(value: number | string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(Number(value) || 0);
}

function dateLabel(value: Date | string) {
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00.000Z`);
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(date);
}

function isIsoDate(value?: string) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)));
}

function Metric({ label, value, tone }: { label: string; value: string; tone: "blue" | "green" | "amber" | "red" | "slate" }) {
  const tones = {
    blue: "text-blue-600",
    green: "text-emerald-600",
    amber: "text-amber-600",
    red: "text-rose-600",
    slate: "text-slate-800",
  };
  return <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className={`mt-2 text-xl font-bold ${tones[tone]}`}>{value}</p></div>;
}

function InvoiceTable({ invoices }: { invoices: Invoice[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead className="bg-slate-50 text-[11px] text-slate-500"><tr>
          <th className="px-4 py-3">Invoice</th><th className="px-4 py-3">Student</th><th className="px-4 py-3">Term</th><th className="px-4 py-3">Invoice date</th><th className="px-4 py-3">Due date</th><th className="px-4 py-3 text-right">Amount</th><th className="px-4 py-3">Status</th>
        </tr></thead>
        <tbody className="divide-y divide-slate-100">{invoices.map((invoice) => <tr key={invoice.id}>
          <td className="px-4 py-3 font-mono text-xs text-indigo-700"><Link href={`/admin/invoices/${invoice.id}`}>{invoice.invoiceNumber}</Link></td>
          <td className="px-4 py-3"><Link className="font-medium text-slate-800 hover:text-indigo-700" href={`/admin/students/${invoice.studentId}`}>{invoice.studentFirstName} {invoice.studentLastName}</Link><span className="block text-[10px] text-slate-400">{invoice.admissionNumber}</span></td>
          <td className="px-4 py-3 text-xs text-slate-600">{invoice.termName} · {invoice.academicYearName}</td><td className="px-4 py-3 text-xs text-slate-500">{dateLabel(invoice.invoiceDate)}</td><td className="px-4 py-3 text-xs text-slate-500">{dateLabel(invoice.dueDate)}</td><td className="px-4 py-3 text-right font-medium">{money(invoice.amount)}</td>
          <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] capitalize text-slate-600">{invoice.status === "pending" && invoice.dueDate < new Date().toISOString().slice(0, 10) ? "overdue" : invoice.status}</span></td>
        </tr>)}{!invoices.length && <tr><td className="px-4 py-10 text-center text-sm text-slate-500" colSpan={7}>No invoices found for this report.</td></tr>}</tbody>
      </table>
    </div>
  );
}

function PaymentTable({ rows }: { rows: PaymentRow[] }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Receipt</th><th className="px-4 py-3">Student</th><th className="px-4 py-3">Method</th><th className="px-4 py-3">Invoice</th><th className="px-4 py-3 text-right">Amount in</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((payment) => <tr key={payment.id}><td className="px-4 py-3 text-xs text-slate-500">{dateLabel(payment.receivedAt)}</td><td className="px-4 py-3 font-mono text-xs text-indigo-700">{payment.reference}</td><td className="px-4 py-3 text-xs font-medium text-slate-800">{payment.firstName} {payment.lastName}</td><td className="px-4 py-3 text-xs capitalize text-slate-600">{payment.method.replaceAll("_", " ")}</td><td className="px-4 py-3 text-xs text-slate-600">{payment.invoiceNumber}</td><td className="px-4 py-3 text-right text-xs font-semibold text-emerald-700">{money(payment.amount)}</td></tr>)}{!rows.length && <tr><td className="px-4 py-10 text-center text-sm text-slate-500" colSpan={6}>No receipts recorded for this period.</td></tr>}</tbody></table></div>;
}

function ExpenseTable({ rows }: { rows: (typeof expenses.$inferSelect)[] }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Vendor</th><th className="px-4 py-3 text-right">Amount out</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((expense) => <tr key={expense.id}><td className="px-4 py-3 text-xs text-slate-500">{dateLabel(expense.expenseDate)}</td><td className="px-4 py-3 text-xs font-medium text-slate-800">{expense.category}</td><td className="px-4 py-3 text-xs text-slate-600">{expense.description}</td><td className="px-4 py-3 text-xs text-slate-500">{expense.vendor || "—"}</td><td className="px-4 py-3 text-right text-xs font-semibold text-rose-700">{money(expense.amount)}</td></tr>)}{!rows.length && <tr><td className="px-4 py-10 text-center text-sm text-slate-500" colSpan={5}>No expenses recorded for this period.</td></tr>}</tbody></table></div>;
}

function ProfitLossReport({
  income,
  expensesByCategory,
  expenseRows,
  expenseTotal,
  net,
  outstanding,
  feeItemTotals,
}: {
  income: number;
  expensesByCategory: Map<string, number>;
  expenseRows: (typeof expenses.$inferSelect)[];
  expenseTotal: number;
  net: number;
  outstanding: number;
  feeItemTotals: Map<string, { billed: number; collected: number }>;
}) {
  return (
    <>
      <div className="border-b border-indigo-100 bg-indigo-50/60 px-4 py-3 text-xs text-indigo-800">
        Cash basis profit and loss for the selected period. Income is recorded fee payments; expenses are recorded operating costs.
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Fee income received" value={money(income)} tone="green" />
        <Metric label="Operating expenses" value={money(expenseTotal)} tone="red" />
        <Metric label={net >= 0 ? "Net operating surplus" : "Net operating deficit"} value={money(Math.abs(net))} tone={net >= 0 ? "blue" : "red"} />
        <Metric label="Outstanding invoices" value={money(outstanding)} tone="amber" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="bg-slate-50 text-[11px] text-slate-500"><tr><th className="px-4 py-3">Profit &amp; loss item</th><th className="px-4 py-3 text-right">Amount</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            <tr className="bg-emerald-50/40"><td className="px-4 py-3 font-semibold text-slate-800">Fee income received</td><td className="px-4 py-3 text-right font-semibold text-emerald-700">{money(income)}</td></tr>
            {[...expensesByCategory.entries()].map(([category, amount]) => (
              <tr key={category}><td className="px-4 py-3 text-slate-700">Operating expense · {category}</td><td className="px-4 py-3 text-right text-rose-700">({money(amount)})</td></tr>
            ))}
            {!expensesByCategory.size && <tr><td className="px-4 py-3 text-slate-500" colSpan={2}>No operating expenses recorded in this period.</td></tr>}
            <tr className="border-t-2 border-slate-200 bg-slate-50">
              <td className="px-4 py-3 font-bold text-slate-900">Net operating {net >= 0 ? "surplus" : "deficit"}</td>
              <td className={`px-4 py-3 text-right font-bold ${net >= 0 ? "text-indigo-700" : "text-rose-700"}`}>{net < 0 ? `(${money(Math.abs(net))})` : money(net)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <h3 className="border-t border-slate-100 px-4 py-3 text-xs font-semibold text-slate-800">Recorded expenses</h3>
      <ExpenseTable rows={expenseRows} />
      <details className="border-t border-slate-100">
        <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-slate-700">View billed and collected amounts by fee item</summary>
        <div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm">
          <thead className="bg-slate-50 text-[11px] text-slate-500"><tr><th className="px-4 py-3">Fee item</th><th className="px-4 py-3 text-right">Billed</th><th className="px-4 py-3 text-right">Collected</th><th className="px-4 py-3 text-right">Outstanding</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {[...feeItemTotals.entries()].map(([name, values]) => <tr key={name}><td className="px-4 py-3 font-medium text-slate-800">{name}</td><td className="px-4 py-3 text-right">{money(values.billed)}</td><td className="px-4 py-3 text-right text-emerald-700">{money(values.collected)}</td><td className="px-4 py-3 text-right text-amber-700">{money(values.billed - values.collected)}</td></tr>)}
            {!feeItemTotals.size && <tr><td className="px-4 py-10 text-center text-sm text-slate-500" colSpan={4}>No fee items were billed in this period.</td></tr>}
          </tbody>
        </table></div>
      </details>
    </>
  );
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ report?: string; q?: string; from?: string; to?: string; asOf?: string }> }) {
  const [session, params, allInvoices] = await Promise.all([
    requireAdminSession(),
    searchParams,
    getInvoiceList({}, { limit: 5000, offset: 0 }),
  ]);
  const selected = reports.find((report) => report.id === params.report) ?? reports[0];
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 8)}01`;
  const asOf = isIsoDate(params.asOf) ? params.asOf! : today;
  const from = isIsoDate(params.from) ? params.from! : monthStart;
  const to = isIsoDate(params.to) ? params.to! : today;
  const query = params.q?.trim().toLowerCase();
  const maxDate = selected.id === "aging" ? asOf : to;
  const paymentRows = await db.select({
    id: payments.id,
    invoiceId: payments.invoiceId,
    reference: payments.reference,
    amount: payments.amount,
    method: payments.method,
    receivedAt: payments.receivedAt,
    invoiceNumber: invoices.invoiceNumber,
    studentId: studentTable.id,
    firstName: studentTable.firstName,
    lastName: studentTable.lastName,
    admissionNumber: studentTable.admissionNumber,
  }).from(payments)
    .innerJoin(invoices, eq(payments.invoiceId, invoices.id))
    .innerJoin(studentTable, eq(invoices.studentId, studentTable.id))
    .where(lte(payments.receivedAt, new Date(`${maxDate}T23:59:59.999Z`)))
    .orderBy(asc(payments.receivedAt), asc(payments.id));
  const paymentsInPeriod = paymentRows.filter((payment) => {
    const date = payment.receivedAt.toISOString().slice(0, 10);
    return date >= from && date <= to && (!query || `${payment.firstName} ${payment.lastName} ${payment.admissionNumber} ${payment.invoiceNumber} ${payment.reference}`.toLowerCase().includes(query));
  });
  const receivedInPeriod = paymentsInPeriod.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const expenseRows = await db.select().from(expenses)
    .where(and(gte(expenses.expenseDate, from), lte(expenses.expenseDate, to)))
    .orderBy(asc(expenses.expenseDate), asc(expenses.id));
  const expensesInPeriod = expenseRows.filter((expense) => !query || `${expense.category} ${expense.description} ${expense.vendor ?? ""} ${expense.reference ?? ""}`.toLowerCase().includes(query));
  const expenseTotal = expensesInPeriod.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const operatingSurplus = receivedInPeriod - expenseTotal;
  const expenseTotalsByCategory = new Map<string, number>();
  for (const expense of expensesInPeriod) expenseTotalsByCategory.set(expense.category, (expenseTotalsByCategory.get(expense.category) ?? 0) + Number(expense.amount));
  const paidByInvoice = new Map<number, number>();
  for (const payment of paymentRows) paidByInvoice.set(payment.invoiceId, (paidByInvoice.get(payment.invoiceId) ?? 0) + Number(payment.amount));
  const periodPaidByInvoice = new Map<number, number>();
  for (const payment of paymentsInPeriod) periodPaidByInvoice.set(payment.invoiceId, (periodPaidByInvoice.get(payment.invoiceId) ?? 0) + Number(payment.amount));
  const invoicePaid = (invoice: Invoice) => paidByInvoice.get(invoice.id) ?? (invoice.status === "paid" ? Number(invoice.amount) : 0);
  const inDateRange = (invoice: Invoice) => {
    const invoiceDate = invoice.invoiceDate instanceof Date ? invoice.invoiceDate.toISOString().slice(0, 10) : String(invoice.invoiceDate).slice(0, 10);
    return (!from || invoiceDate >= from) && (!to || invoiceDate <= to);
  };
  const searchedInvoices = allInvoices.filter(inDateRange).filter((invoice) => !query ||
    `${invoice.studentFirstName} ${invoice.studentLastName} ${invoice.admissionNumber} ${invoice.invoiceNumber}`.toLowerCase().includes(query),
  );
  const rangedInvoices = allInvoices.filter(inDateRange);
  const activeRangedInvoices = rangedInvoices.filter((invoice) => invoice.status !== "cancelled");
  const agedInvoices = allInvoices.filter((invoice) => {
    const invoiceDate = invoice.invoiceDate instanceof Date ? invoice.invoiceDate.toISOString().slice(0, 10) : String(invoice.invoiceDate).slice(0, 10);
    return invoice.status !== "cancelled" && invoiceDate <= asOf && invoicePaid(invoice) < Number(invoice.amount);
  }).map((invoice) => ({ ...invoice, amount: String(Math.max(0, Number(invoice.amount) - invoicePaid(invoice))) }));
  const buckets = [
    { label: "0–30 days overdue", test: (days: number) => days >= 0 && days <= 30 },
    { label: "31–60 days overdue", test: (days: number) => days > 30 && days <= 60 },
    { label: "61–90 days overdue", test: (days: number) => days > 60 && days <= 90 },
    { label: "91–120 days overdue", test: (days: number) => days > 90 && days <= 120 },
    { label: "Over 120 days overdue", test: (days: number) => days > 120 },
  ].map((bucket) => ({ ...bucket, invoices: agedInvoices.filter((invoice) => {
    const invoiceDate = invoice.invoiceDate instanceof Date ? invoice.invoiceDate.toISOString().slice(0, 10) : String(invoice.invoiceDate).slice(0, 10);
    const days = Math.floor((Date.parse(`${asOf}T00:00:00.000Z`) - Date.parse(`${invoiceDate}T00:00:00.000Z`)) / 86_400_000);
    return bucket.test(days);
  }) }));
  const billed = activeRangedInvoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0);
  const paid = activeRangedInvoices.reduce((sum, invoice) => sum + Math.min(Number(invoice.amount), invoicePaid(invoice)), 0);
  const balance = activeRangedInvoices.reduce((sum, invoice) => sum + Math.max(0, Number(invoice.amount) - invoicePaid(invoice)), 0);
  const feeItemRecords = await db.select({ invoiceId: invoices.id, invoiceAmount: invoices.amount, status: invoices.status, name: invoiceItems.name, amount: invoiceItems.amount })
    .from(invoiceItems)
    .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
    .where(and(
      gte(invoices.createdAt, new Date(`${from}T00:00:00.000Z`)),
      lte(invoices.createdAt, new Date(`${to}T23:59:59.999Z`)),
    ));
  const feeItemTotals = new Map<string, { billed: number; collected: number }>();
  for (const item of feeItemRecords) {
    if (item.status === "cancelled") continue;
    const total = feeItemTotals.get(item.name) ?? { billed: 0, collected: 0 };
    const value = Number(item.amount) || 0;
    total.billed += value;
    const invoiceTotal = Number(item.invoiceAmount) || 0;
    const collected = Math.min(invoiceTotal, periodPaidByInvoice.get(item.invoiceId) ?? (item.status === "paid" ? invoiceTotal : 0));
    total.collected += invoiceTotal > 0 ? value * Math.min(1, collected / invoiceTotal) : 0;
    feeItemTotals.set(item.name, total);
  }
  const students = new Map<number, { name: string; admission: string; opening: number; billed: number; received: number; closing: number }>();
  for (const invoice of allInvoices) {
    const date = invoice.invoiceDate instanceof Date ? invoice.invoiceDate.toISOString().slice(0, 10) : String(invoice.invoiceDate).slice(0, 10);
    const row = students.get(invoice.studentId) ?? { name: `${invoice.studentFirstName} ${invoice.studentLastName}`, admission: invoice.admissionNumber, opening: 0, billed: 0, received: 0, closing: 0 };
    const amount = Number(invoice.amount);
    if (invoice.status === "cancelled") continue;
    if (date < from) {
      const priorPayments = paymentRows.filter((payment) => payment.invoiceId === invoice.id && payment.receivedAt.toISOString().slice(0, 10) < from).reduce((sum, payment) => sum + Number(payment.amount), 0);
      row.opening += Math.max(0, amount - (priorPayments || (invoice.status === "paid" ? amount : 0)));
    } else if (date <= to) {
      row.billed += amount;
      if (invoice.status === "paid" && !paidByInvoice.has(invoice.id)) row.received += amount;
    }
    students.set(invoice.studentId, row);
  }
  for (const payment of paymentsInPeriod) {
    const row = students.get(payment.studentId) ?? { name: `${payment.firstName} ${payment.lastName}`, admission: payment.admissionNumber, opening: 0, billed: 0, received: 0, closing: 0 };
    row.received += Number(payment.amount);
    students.set(payment.studentId, row);
  }
  for (const row of students.values()) row.closing = row.opening + row.billed - row.received;
  const statementRows = [...students.entries()].filter(([id]) => !query || `${students.get(id)?.name} ${students.get(id)?.admission}`.toLowerCase().includes(query)).map(([id, row]) => ({ id, ...row })).filter((row) => row.opening || row.billed || row.received || row.closing);
  const pdfQuery = new URLSearchParams({ report: selected.id, from, to, asOf });
  if (params.q) pdfQuery.set("q", params.q);

  return <StudentsShell activeSection="reports" userName={session.user.name}>
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4"><div><div className="mb-2 flex items-center gap-2 text-xs text-slate-400"><Link className="hover:text-indigo-700" href="/admin">⌂</Link><span>›</span><span className="text-slate-600">Reports</span></div><h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Financial Reports</h1><p className="mt-1 text-sm text-slate-500">View and manage financial reports, debtor reports, and school financial insights.</p></div>
      <form action="/admin/reports" className="flex flex-wrap items-end gap-2" method="get"><input name="report" type="hidden" defaultValue={selected.id} />{selected.id === "aging" ? <label className="text-[10px] font-medium text-slate-500">As of<input className="mt-1 block h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700" name="asOf" type="date" defaultValue={asOf} /></label> : <><label className="text-[10px] font-medium text-slate-500">From<input className="mt-1 block h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700" name="from" type="date" defaultValue={from} /></label><label className="text-[10px] font-medium text-slate-500">To<input className="mt-1 block h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-700" name="to" type="date" defaultValue={to} /></label></>}<button className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-xs font-semibold text-white hover:bg-indigo-700" type="submit"><Play className="size-3.5" />Run report</button></form>
    </div>

    <nav aria-label="Report types" className="mb-0 flex gap-1 overflow-x-auto border-b border-slate-200">{reports.map((report) => { const Icon = report.icon; return <Link key={report.id} aria-current={selected.id === report.id ? "page" : undefined} className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-xs font-medium ${selected.id === report.id ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-800"}`} href={`/admin/reports?report=${report.id}`}><Icon className="size-4" />{report.name}</Link>; })}</nav>

    <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 sm:p-5"><div><h2 className="text-base font-semibold text-slate-900">{selected.name}</h2><p className="mt-1 text-xs text-slate-500">{selected.description}</p></div><Link className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-700 px-3 text-xs font-semibold text-white hover:bg-slate-800" href={`/api/admin/reports/pdf?${pdfQuery}`}><Download className="size-3.5" />Download PDF</Link>
        {(selected.id === "statement" || selected.id === "invoices") && <form className="flex gap-2" action="/admin/reports" method="get"><input name="report" type="hidden" defaultValue={selected.id} /><input name="from" type="hidden" defaultValue={from} /><input name="to" type="hidden" defaultValue={to} /><input aria-label="Search student or invoice" className="h-9 w-56 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-indigo-400" defaultValue={params.q} name="q" placeholder="Student or invoice number" /><button className="h-9 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700" type="submit">Search</button></form>}
      </div>

      {selected.id === "invoices" && <><div className="grid gap-3 p-4 sm:grid-cols-3"><Metric label="Billed" value={money(billed)} tone="blue" /><Metric label="Received" value={money(paid)} tone="green" /><Metric label="Outstanding" value={money(balance)} tone="amber" /></div><InvoiceTable invoices={searchedInvoices} /></>}
      {selected.id === "statement" && <><div className="border-b border-slate-100 bg-slate-50/70 px-4 py-3 text-xs text-slate-500">Opening and closing balances use recorded payments and invoice balances. Older invoices marked paid before receipting was added are treated as settled.</div><div className="grid gap-3 p-4 sm:grid-cols-4"><Metric label="Opening balance" value={money(statementRows.reduce((sum, row) => sum + row.opening, 0))} tone="slate" /><Metric label="Billed" value={money(statementRows.reduce((sum, row) => sum + row.billed, 0))} tone="blue" /><Metric label="Received" value={money(statementRows.reduce((sum, row) => sum + row.received, 0))} tone="green" /><Metric label="Closing balance" value={money(statementRows.reduce((sum, row) => sum + row.closing, 0))} tone="amber" /></div><div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-[11px] text-slate-500"><tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Opening</th><th className="px-4 py-3">Billed</th><th className="px-4 py-3">Received</th><th className="px-4 py-3">Closing</th></tr></thead><tbody className="divide-y divide-slate-100">{statementRows.map((row) => <tr key={row.id}><td className="px-4 py-3"><Link className="font-medium text-indigo-700" href={`/admin/students/${row.id}`}>{row.name}</Link><span className="block text-xs text-slate-400">{row.admission}</span></td><td className="px-4 py-3">{money(row.opening)}</td><td className="px-4 py-3">{money(row.billed)}</td><td className="px-4 py-3 text-emerald-700">{money(row.received)}</td><td className="px-4 py-3 font-semibold">{money(row.closing)}</td></tr>)}{!statementRows.length && <tr><td className="px-4 py-10 text-center text-sm text-slate-500" colSpan={5}>No student statements for this period.</td></tr>}</tbody></table></div></>}
      {selected.id === "aging" && <div className="p-4 sm:p-5"><p className="mb-4 text-xs text-slate-500">As of {dateLabel(asOf)} · Unpaid balances are aged from invoice date.</p><div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><Metric label="Total outstanding" value={money(agedInvoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0))} tone="red" />{buckets.map((bucket) => <Metric key={bucket.label} label={bucket.label} value={money(bucket.invoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0))} tone="slate" />)}</div><InvoiceTable invoices={agedInvoices} /></div>}
      {selected.id === "cashbook" && <><div className="border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-600">Cash movement from recorded fee payments and operating expenses.</div><div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Money in" value={money(receivedInPeriod)} tone="green" /><Metric label="Money out" value={money(expenseTotal)} tone="red" /><Metric label="Net cash movement" value={money(operatingSurplus)} tone={operatingSurplus >= 0 ? "slate" : "red"} /><Metric label="Transactions" value={String(paymentsInPeriod.length + expensesInPeriod.length)} tone="blue" /></div><h3 className="border-t border-slate-100 px-4 py-3 text-xs font-semibold text-slate-800">Receipts</h3><PaymentTable rows={paymentsInPeriod} /><h3 className="border-t border-slate-100 px-4 py-3 text-xs font-semibold text-slate-800">Expenses</h3><ExpenseTable rows={expensesInPeriod} /></>}
      {selected.id === "financial" && <ProfitLossReport income={receivedInPeriod} expensesByCategory={expenseTotalsByCategory} expenseRows={expensesInPeriod} expenseTotal={expenseTotal} net={operatingSurplus} outstanding={balance} feeItemTotals={feeItemTotals} />}
      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-4 py-3 text-xs text-slate-500"><span>{rangedInvoices.length} invoice records in selected period</span><Link className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:text-indigo-800" href="/admin/invoices"><ArrowLeft className="size-3" />Invoices</Link></div>
    </section>
  </StudentsShell>;
}
