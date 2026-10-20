import Link from "next/link";
import { and, asc, desc, gte, lte } from "drizzle-orm";
import { Banknote, CalendarDays, Plus, ReceiptText } from "lucide-react";
import { recordExpense } from "@/app/admin/expenses/actions";
import { db } from "@/db";
import { expenses } from "@/db/schema";
import { StudentFeedback } from "@/components/students/student-feedback";
import { StudentsShell } from "@/components/students/students-shell";
import { AlertDialogForm } from "@/components/forms/alert-dialog-form";
import { requireAdminSession } from "@/lib/admin";

function isDate(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function money(value: string | number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(Number(value) || 0);
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00.000Z`));
}

const methodNames: Record<string, string> = { cash: "Cash", bank_transfer: "Bank transfer", ecocash: "EcoCash", card: "Card", other: "Other" };

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; error?: string; notice?: string }> }) {
  const [session, params] = await Promise.all([requireAdminSession(), searchParams]);
  const today = new Date().toISOString().slice(0, 10);
  const from = isDate(params.from) ? params.from! : `${today.slice(0, 8)}01`;
  const to = isDate(params.to) ? params.to! : today;
  const rows = await db.select().from(expenses)
    .where(and(gte(expenses.expenseDate, from), lte(expenses.expenseDate, to)))
    .orderBy(desc(expenses.expenseDate), asc(expenses.id));
  const total = rows.reduce((sum, row) => sum + Number(row.amount), 0);
  const byCategory = new Map<string, number>();
  for (const row of rows) byCategory.set(row.category, (byCategory.get(row.category) || 0) + Number(row.amount));
  const defaultDate = today;

  return <StudentsShell activeSection="expenses" userName={session.user.name}>
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
      <div><div className="mb-2 flex items-center gap-2 text-xs text-slate-400"><Link className="hover:text-indigo-700" href="/admin">Dashboard</Link><span>›</span><span className="text-slate-600">Expenses</span></div><p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-600">School finances</p><h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Operating expenses</h1><p className="mt-1 text-sm text-slate-500">Record day-to-day costs and review spending for a selected period.</p></div>
      <Link className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-50" href={`/admin/reports?report=financial&from=${from}&to=${to}`}><ReceiptText className="size-3.5" />Profit &amp; loss report</Link>
    </div>
    <StudentFeedback error={params.error} notice={params.notice} />

    <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-sm font-semibold text-slate-900">Record expenses</h2><p className="mt-0.5 text-[11px] text-slate-500">Track operating costs and school spending.</p></div><AlertDialogForm title="Record an expense" description="Enter the amount paid by the school and its expense category." triggerLabel="Add expense">
      <form action={recordExpense} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-medium text-slate-700">Date<input className="mt-1.5 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" defaultValue={defaultDate} max={today} name="expenseDate" required type="date" /></label>
        <label className="text-xs font-medium text-slate-700">Category<input className="mt-1.5 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" list="expense-categories" maxLength={60} name="category" placeholder="e.g. Utilities" required /><datalist id="expense-categories">{["Salaries", "Rent", "Utilities", "Learning materials", "Transport", "Maintenance", "Food", "Insurance", "Other"].map((category) => <option key={category} value={category} />)}</datalist></label>
        <label className="text-xs font-medium text-slate-700">Description<input className="mt-1.5 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" maxLength={240} name="description" placeholder="What was paid for?" required /></label>
        <label className="text-xs font-medium text-slate-700">Amount (USD)<input className="mt-1.5 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" min="0.01" name="amount" placeholder="0.00" required step="0.01" type="number" /></label>
        <label className="text-xs font-medium text-slate-700">Vendor / payee<input className="mt-1.5 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" maxLength={120} name="vendor" placeholder="Optional" /></label>
        <label className="text-xs font-medium text-slate-700">Payment method<select className="mt-1.5 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" defaultValue="cash" name="method"><option value="cash">Cash</option><option value="bank_transfer">Bank transfer</option><option value="ecocash">EcoCash</option><option value="card">Card</option><option value="other">Other</option></select></label>
        <label className="text-xs font-medium text-slate-700">Reference<input className="mt-1.5 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" maxLength={100} name="reference" placeholder="Receipt or transaction number" /></label>
        <div className="flex items-end"><button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-xs font-semibold text-white hover:bg-indigo-700" type="submit">Save expense</button></div>
      </form>
      </AlertDialogForm></div>
    </section>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4 sm:p-5"><div><h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Banknote className="size-4 text-indigo-600" />Expense ledger</h2><p className="mt-1 text-xs text-slate-500">{dateLabel(from)} – {dateLabel(to)} · {rows.length} records</p></div><form action="/admin/expenses" className="flex flex-wrap items-end gap-2" method="get"><label className="text-[10px] font-medium text-slate-500">From<input className="mt-1 block h-9 rounded-lg border border-slate-200 px-2 text-xs" defaultValue={from} name="from" type="date" /></label><label className="text-[10px] font-medium text-slate-500">To<input className="mt-1 block h-9 rounded-lg border border-slate-200 px-2 text-xs" defaultValue={to} name="to" type="date" /></label><button className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white"><CalendarDays className="size-3.5" />Apply</button></form></div>
      <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2"><div className="rounded-xl bg-rose-50 p-4"><p className="text-[10px] font-semibold uppercase tracking-wide text-rose-700">Expenses for period</p><p className="mt-1 text-xl font-bold text-rose-700">{money(total)}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Categories</p><p className="mt-1 text-xl font-bold text-slate-800">{byCategory.size}</p><p className="text-[10px] text-slate-500">{[...byCategory.keys()].join(", ") || "No expense categories yet"}</p></div></div>
      <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Category / Description</th><th className="px-4 py-3">Vendor</th><th className="px-4 py-3">Method</th><th className="px-4 py-3">Reference</th><th className="px-4 py-3 text-right">Amount</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((row) => <tr key={row.id}><td className="px-4 py-3 text-xs text-slate-500">{dateLabel(row.expenseDate)}</td><td className="px-4 py-3"><span className="block text-xs font-semibold text-slate-800">{row.category}</span><span className="mt-0.5 block text-xs text-slate-500">{row.description}</span></td><td className="px-4 py-3 text-xs text-slate-600">{row.vendor || "—"}</td><td className="px-4 py-3 text-xs text-slate-600">{methodNames[row.method] ?? row.method}</td><td className="px-4 py-3 font-mono text-xs text-slate-500">{row.reference || "—"}</td><td className="px-4 py-3 text-right text-xs font-semibold text-rose-700">{money(row.amount)}</td></tr>)}{!rows.length && <tr><td className="px-4 py-12 text-center text-sm text-slate-500" colSpan={6}>No expenses recorded for this date range.</td></tr>}</tbody></table></div>
    </section>
  </StudentsShell>;
}
