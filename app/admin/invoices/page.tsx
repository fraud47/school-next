import Link from "next/link";
import { ChevronLeft, ChevronRight, Download, FileStack, FileText, Filter, Plus, Search, Wallet } from "lucide-react";
import { StudentFeedback } from "@/components/students/student-feedback";
import { StudentsShell } from "@/components/students/students-shell";
import { requireAdminSession } from "@/lib/admin";
import {
  countInvoices,
  getInvoiceFilterOptions,
  getInvoiceList,
  getInvoiceMetrics,
  type InvoiceFilters,
} from "@/lib/invoice-data";

const PAGE_SIZE = 10;
const STATUSES = ["paid", "overdue", "pending", "cancelled"] as const;

type SearchParams = {
  q?: string;
  academicYearId?: string;
  termId?: string;
  classId?: string;
  status?: string;
  page?: string;
  notice?: string;
  error?: string;
};

function id(value?: string) {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function money(value: string | null) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function dateLabel(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(date);
}

function invoiceStatus(status: "paid" | "pending" | "cancelled", dueDate: string) {
  if (status === "pending" && dueDate < new Date().toISOString().slice(0, 10)) return "overdue";
  return status;
}

function hrefWith(params: SearchParams, page: number) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...params, page: String(page) })) {
    if (value) query.set(key, value);
  }
  return `/admin/invoices?${query}`;
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [session, params, options] = await Promise.all([
    requireAdminSession(),
    searchParams,
    getInvoiceFilterOptions(),
  ]);
  const selectedYear = params.academicYearId === "all"
    ? undefined
    : options.years.find((year) => year.id === id(params.academicYearId)) ??
      options.years.find((year) => year.isCurrent) ??
      options.years[0];
  const availableTerms = options.terms.filter((term) => !selectedYear || term.academicYearId === selectedYear.id);
  const selectedTerm = params.termId === "all"
    ? undefined
    : availableTerms.find((term) => term.id === id(params.termId)) ?? availableTerms[0];
  const selectedClass = options.classes.find((item) =>
    item.id === id(params.classId) && (!selectedYear || item.academicYearId === selectedYear.id),
  );
  const status = STATUSES.find((value) => value === params.status);
  const filters: InvoiceFilters = {
    academicYearId: selectedYear?.id,
    termId: selectedTerm?.id,
    classId: selectedClass?.id,
    status,
    query: params.q?.trim() || undefined,
  };
  const requestedPage = Number(params.page);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const [total, metrics] = await Promise.all([
    countInvoices(filters),
    getInvoiceMetrics(filters),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const invoices = await getInvoiceList(filters, {
    limit: PAGE_SIZE,
    offset: (currentPage - 1) * PAGE_SIZE,
  });
  const paidPercent = metrics.totalCount
    ? Math.round((metrics.paidCount / metrics.totalCount) * 100)
    : 0;
  const exportParams = new URLSearchParams();
  if (filters.academicYearId) exportParams.set("academicYearId", String(filters.academicYearId));
  if (filters.termId) exportParams.set("termId", String(filters.termId));
  if (filters.classId) exportParams.set("classId", String(filters.classId));
  if (filters.status) exportParams.set("status", filters.status);
  if (filters.query) exportParams.set("q", filters.query);

  return (
    <StudentsShell activeSection="invoices" userName={session.user.name}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
            <Link className="hover:text-indigo-700" href="/admin">Dashboard</Link>
            <ChevronRight className="size-3" />
            <span className="text-slate-600">Invoices</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">School invoices</h1>
          <p className="mt-1 text-sm text-slate-500">Manage student invoices and monitor outstanding balances.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="invoice-year">Academic year</label>
          <select className="h-10 min-w-36 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" defaultValue={selectedYear?.id ?? "all"} form="invoice-filters" id="invoice-year" name="academicYearId">
            <option value="all">All academic years</option>
            {options.years.map((year) => <option key={year.id} value={year.id}>{year.name}{year.isCurrent ? " · Current" : ""}</option>)}
          </select>
          <label className="sr-only" htmlFor="invoice-term">Term</label>
          <select className="h-10 min-w-32 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" defaultValue={selectedTerm?.id ?? "all"} form="invoice-filters" id="invoice-term" name="termId">
            <option value="all">All terms</option>
            {availableTerms.map((term) => <option key={term.id} value={term.id}>{term.name}</option>)}
          </select>
          <Link className="inline-flex h-10 items-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 text-sm font-semibold text-indigo-700 shadow-sm hover:bg-indigo-50" href="/admin/invoices/bulk"><FileStack className="size-4" />Bulk invoices</Link>
          <Link className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700" href="/admin/invoices/new"><Plus className="size-4" />Add invoice</Link>
        </div>
      </div>

      <StudentFeedback error={params.error} notice={params.notice} />

      <div className="mb-5 grid gap-3 sm:grid-cols-4 xl:grid-cols-4">
        <Metric icon={<FileText className="size-5" />} label="Total invoices" value={money(metrics.totalAmount)} note={`${metrics.totalCount.toLocaleString()} invoices`} tone="blue" />
        <Metric icon={<Wallet className="size-5" />} label="Paid invoice value" value={money(metrics.paidAmount)} note={`${metrics.paidCount.toLocaleString()} paid`} tone="green" />
        <Metric icon={<Wallet className="size-5" />} label="Outstanding balance" value={money(metrics.pendingAmount)} note={`${metrics.pendingCount.toLocaleString()} pending`} tone="rose" />
        <Metric icon={<FileText className="size-5" />} label="Paid invoices" value={`${paidPercent}%`} note={`${metrics.paidCount.toLocaleString()} of ${metrics.totalCount.toLocaleString()}`} tone="violet" />
      </div>

      <form className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_260px]" id="invoice-filters" method="get">
        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Invoices ({total.toLocaleString()})</h2>
              <p className="mt-0.5 text-xs text-slate-500">{selectedTerm ? `${selectedTerm.name} · ${selectedYear?.name}` : selectedYear?.name || "All academic years"}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative">
                <span className="sr-only">Search invoices</span>
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input className="h-9 w-48 rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 sm:w-64" defaultValue={params.q} name="q" placeholder="Invoice number or student..." type="search" />
              </label>
              <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 hover:bg-slate-50" type="submit"><Filter className="size-3.5" />Filters</button>
              <a className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 hover:bg-slate-50" href={`/api/admin/invoices/export${exportParams.size ? `?${exportParams}` : ""}`}><Download className="size-3.5" />Export</a>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-medium text-slate-500">
                <tr>
                  <th className="px-4 py-3">Invoice #</th>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Term</th>
                  <th className="px-4 py-3">Academic year</th>
                  <th className="px-4 py-3">Invoice date</th>
                  <th className="px-4 py-3">Due date</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((invoice) => {
                  const displayedStatus = invoiceStatus(invoice.status, invoice.dueDate);
                  const statusStyle = displayedStatus === "paid"
                    ? "bg-emerald-50 text-emerald-700"
                    : displayedStatus === "overdue"
                      ? "bg-rose-50 text-rose-700"
                      : displayedStatus === "cancelled"
                        ? "bg-slate-100 text-slate-600"
                        : "bg-blue-50 text-blue-700";
                  return (
                    <tr className="hover:bg-slate-50/70" key={invoice.id}>
                      <td className="px-4 py-3.5 font-mono text-xs font-medium text-indigo-700"><Link className="hover:underline" href={`/admin/invoices/${invoice.id}`}>{invoice.invoiceNumber}</Link></td>
                      <td className="px-4 py-3.5">
                        <Link className="block font-medium text-slate-800 hover:text-indigo-700" href={`/admin/students/${invoice.studentId}`}>{invoice.studentFirstName} {invoice.studentLastName}</Link>
                        <span className="text-[10px] text-slate-400">{invoice.admissionNumber}</span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">{invoice.gradeName ? `${invoice.gradeName} · ${invoice.className}` : "—"}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">{invoice.termName}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-600">{invoice.academicYearName}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">{dateLabel(invoice.invoiceDate)}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">{dateLabel(invoice.dueDate)}</td>
                      <td className="px-4 py-3.5 text-right text-xs font-semibold text-slate-800">{money(invoice.amount)}</td>
                      <td className="px-4 py-3.5"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold capitalize ${statusStyle}`}>{displayedStatus}</span></td>
                    </tr>
                  );
                })}
                {!invoices.length && (
                  <tr><td className="px-6 py-16 text-center" colSpan={9}>
                    <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><FileText className="size-5" /></span>
                    <h3 className="mt-4 font-semibold text-slate-800">{params.q || status ? "No invoices match these filters" : "No invoices yet"}</h3>
                    <p className="mt-1 text-sm text-slate-500">{params.q || status ? "Try changing the search or filters." : "Create the first invoice to start tracking school fees."}</p>
                    <Link className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700" href="/admin/invoices/new"><Plus className="size-4" />Add invoice</Link>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
            <span>Showing {total ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(currentPage * PAGE_SIZE, total)} of {total.toLocaleString()} invoices</span>
            <div className="flex items-center gap-1">
              <Link aria-disabled={currentPage <= 1} className={`inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 ${currentPage <= 1 ? "pointer-events-none opacity-40" : "hover:bg-slate-50"}`} href={hrefWith(params, Math.max(1, currentPage - 1))}><ChevronLeft className="size-4" /></Link>
              <span className="px-2">Page {currentPage} of {pageCount}</span>
              <Link aria-disabled={currentPage >= pageCount} className={`inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 ${currentPage >= pageCount ? "pointer-events-none opacity-40" : "hover:bg-slate-50"}`} href={hrefWith(params, Math.min(pageCount, currentPage + 1))}><ChevronRight className="size-4" /></Link>
            </div>
          </div>
        </section>

        <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Filters</h2>
            <Link className="text-xs font-medium text-indigo-600 hover:text-indigo-800" href="/admin/invoices">Reset</Link>
          </div>
          <div className="space-y-3">
            <FilterField label="Class" name="classId" value={selectedClass?.id ?? "all"}>
              <option value="all">All classes</option>
              {options.classes.filter((item) => !selectedYear || item.academicYearId === selectedYear.id).map((item) => <option key={item.id} value={item.id}>{item.gradeName} · {item.name}</option>)}
            </FilterField>
            <FilterField label="Status" name="status" value={status || "all"}>
              <option value="all">All statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </FilterField>
          </div>
          <button className="mt-4 h-9 w-full rounded-lg bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700" type="submit">Apply filters</button>
        </aside>
      </form>
    </StudentsShell>
  );
}

function Metric({
  icon,
  label,
  value,
  note,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
  tone: "blue" | "green" | "rose" | "violet";
}) {
  const styles = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
    violet: "bg-violet-50 text-violet-600",
  };
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-3">
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${styles[tone]}`}>{icon}</span>
        <div className="min-w-0">
          <p className="truncate text-xs text-slate-500">{label}</p>
          <p className="mt-1 truncate text-xl font-bold tracking-tight text-slate-900">{value}</p>
          <p className="mt-0.5 text-[10px] text-slate-400">{note}</p>
        </div>
      </div>
    </section>
  );
}

function FilterField({
  label,
  name,
  value,
  children,
}: {
  label: string;
  name: string;
  value: string | number;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-xs font-medium text-slate-600">
      {label}
      <select className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" defaultValue={value} name={name}>{children}</select>
    </label>
  );
}
