import Link from "next/link";
import {
  asc,
  desc,
  eq,
} from "drizzle-orm";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  GraduationCap,
  MoreHorizontal,
  Plus,
  Search,
  UsersRound,
  Wallet,
} from "lucide-react";
import { StudentFeedback } from "@/components/students/student-feedback";
import { StudentsShell } from "@/components/students/students-shell";
import { db } from "@/db";
import { academicYears, classes, gradeLevels, terms } from "@/db/schema";
import { requireAdminSession } from "@/lib/admin";
import {
  countStudentDirectoryRows,
  getAcademicYearDirectoryOptions,
  getParentsForStudents,
  getStudentDirectoryMetrics,
  getStudentDirectoryRows,
  getStudentsByClass,
  type StudentDirectoryFilters,
} from "@/lib/student-directory";

const PAGE_SIZE = 10;

type SearchParams = {
  q?: string;
  academicYearId?: string;
  termId?: string;
  classId?: string;
  placement?: string;
  view?: string;
  page?: string;
  notice?: string;
  error?: string;
};

function parseId(value?: string) {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function formatCurrency(value: string | null) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function createHref(params: SearchParams, updates: Partial<SearchParams>) {
  const next = { ...params, ...updates };
  const query = new URLSearchParams();
  for (const key of ["q", "academicYearId", "termId", "classId", "placement", "view", "page"] as const) {
    const value = next[key];
    if (value) query.set(key, value);
  }
  return `/admin/students${query.size ? `?${query}` : ""}`;
}

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [session, params, yearOptions, formOptions] = await Promise.all([
    requireAdminSession(),
    searchParams,
    getAcademicYearDirectoryOptions(),
    getStudentFormOptions(),
  ]);
  const selectedYear =
    params.academicYearId === "all"
      ? undefined
      : yearOptions.find((year) => year.id === parseId(params.academicYearId)) ??
        yearOptions.find((year) => year.isCurrent) ??
        yearOptions[0];
  const availableTerms = formOptions.termOptions.filter(
    (term) => !selectedYear || term.academicYearId === selectedYear.id,
  );
  const selectedTerm =
    params.termId === "all"
      ? undefined
      : availableTerms.find((term) => term.id === parseId(params.termId)) ??
        availableTerms.find((term) => {
          const today = new Date().toISOString().slice(0, 10);
          return term.startDate <= today && term.endDate >= today;
        }) ??
        availableTerms[0];
  const selectedClass = formOptions.classOptions.find(
    (classOption) =>
      classOption.id === parseId(params.classId) &&
      (!selectedYear || classOption.academicYearId === selectedYear.id),
  );
  const placement =
    params.placement === "enrolled" || params.placement === "unassigned"
      ? params.placement
      : undefined;
  const filters: StudentDirectoryFilters = {
    academicYearId: selectedYear?.id,
    termId: selectedTerm?.id,
    classId: selectedClass?.id,
    placement,
    query: params.q?.trim() || undefined,
  };
  const view = ["all", "class", "term", "year"].includes(params.view || "")
    ? params.view!
    : "all";
  const pageValue = Number(params.page);
  const requestedPage =
    Number.isSafeInteger(pageValue) && pageValue > 0 ? pageValue : 1;
  const [total, metrics, classRows] = await Promise.all([
    countStudentDirectoryRows(filters),
    getStudentDirectoryMetrics(filters, selectedYear),
    getStudentsByClass({
      academicYearId: selectedYear?.id,
      termId: selectedTerm?.id,
    }),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, pageCount);
  const students = await getStudentDirectoryRows(filters, {
    limit: PAGE_SIZE,
    offset: (currentPage - 1) * PAGE_SIZE,
    view,
  });
  const parentNames = await getParentsForStudents(students.map((student) => student.id));
  const maxClassCount = Math.max(1, ...classRows.map((row) => row.studentCount));
  const exportQuery = new URLSearchParams();
  if (filters.academicYearId) exportQuery.set("academicYearId", String(filters.academicYearId));
  if (filters.termId) exportQuery.set("termId", String(filters.termId));
  if (filters.classId) exportQuery.set("classId", String(filters.classId));
  if (filters.placement) exportQuery.set("placement", filters.placement);
  if (filters.query) exportQuery.set("q", filters.query);

  return (
    <StudentsShell userName={session.user.name}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs text-slate-400">
            <Link className="hover:text-indigo-700" href="/admin">Dashboard</Link>
            <ChevronRight className="size-3" />
            <span className="text-slate-600">Students</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Students</h1>
          <p className="mt-1 text-sm text-slate-500">Manage student records, class placements, and outstanding invoices.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="year-shortcut">Academic year</label>
          <select className="h-10 min-w-36 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" id="year-shortcut" defaultValue={selectedYear?.id ?? "all"} form="student-filters" name="academicYearId">
            <option value="all">All academic years</option>
            {yearOptions.map((year) => <option key={year.id} value={year.id}>{year.name}{year.isCurrent ? " · Current" : ""}</option>)}
          </select>
          <label className="sr-only" htmlFor="term-shortcut">Term</label>
          <select className="h-10 min-w-32 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" id="term-shortcut" defaultValue={selectedTerm?.id ?? "all"} form="student-filters" name="termId">
            <option value="all">All terms</option>
            {formOptions.termOptions.map((term) => <option key={term.id} value={term.id}>{term.name} · {term.academicYearName}</option>)}
          </select>
          <Link className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700" href="/admin/students/new">
            <Plus className="size-4" />
            Add student
          </Link>
        </div>
      </div>

      <StudentFeedback error={params.error} notice={params.notice} />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<UsersRound className="size-5" />} label="Total students" value={metrics.total.toLocaleString()} tone="blue" />
        <MetricCard icon={<GraduationCap className="size-5" />} label="Enrolled in selection" value={metrics.enrolled.toLocaleString()} tone="green" />
        <MetricCard icon={<Plus className="size-5" />} label={selectedYear ? `Records created · ${selectedYear.name}` : "Records created · last 30 days"} value={metrics.admissions.toLocaleString()} tone="violet" />
        <MetricCard icon={<Wallet className="size-5" />} label="Pending invoice value" value={formatCurrency(metrics.pendingInvoiceValue)} tone="orange" />
      </div>

      <div className="mb-3 flex gap-5 overflow-x-auto border-b border-slate-200 text-sm">
        {([
          ["all", "All students"],
          ["class", "By class"],
          ["term", "By term"],
          ["year", "By academic year"],
        ] as const).map(([value, label]) => (
          <Link aria-current={view === value ? "page" : undefined} className={`-mb-px shrink-0 border-b-2 px-1 pb-3 font-medium transition-colors ${view === value ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-800"}`} href={createHref(params, { view: value, page: "1" })} key={value}>
            {label}
          </Link>
        ))}
      </div>

      <form className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_270px]" id="student-filters" method="get">
        <input name="view" type="hidden" value={view} />
        <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
            <div>
              <h2 className="font-semibold text-slate-900">Students ({total.toLocaleString()})</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {selectedTerm ? `${selectedTerm.name} · ${selectedYear?.name}` : selectedYear?.name || "All academic years"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative">
                <span className="sr-only">Search students</span>
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input className="h-9 w-48 rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 sm:w-56" defaultValue={params.q} name="q" placeholder="Search students..." type="search" />
              </label>
              <button className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 hover:bg-slate-50" type="submit"><Filter className="size-3.5" /> Apply</button>
              <a className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-600 hover:bg-slate-50" href={`/api/admin/students/export${exportQuery.size ? `?${exportQuery}` : ""}`}><Download className="size-3.5" /> Export</a>
              <Link aria-label="School academic setup" className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50" href="/admin/academic/setup"><MoreHorizontal className="size-4" /></Link>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-medium text-slate-500">
                <tr>
                  <th className="w-10 px-3 py-3"><span className="sr-only">Row</span></th>
                  <th className="px-3 py-3">Student</th>
                  <th className="px-3 py-3">Admission no.</th>
                  <th className="px-3 py-3">Class</th>
                  <th className="px-3 py-3">Term</th>
                  <th className="px-3 py-3">Academic year</th>
                  <th className="px-3 py-3">Placement</th>
                  <th className="px-3 py-3 text-right">Pending invoices</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student) => {
                  const initials = `${student.firstName[0] || ""}${student.lastName[0] || ""}`.toUpperCase();
                  const enrolled = Boolean(student.classId);
                  return (
                    <tr className="transition-colors hover:bg-slate-50/70" key={student.id}>
                      <td className="px-3 py-3.5"><span aria-hidden="true" className="block size-2 rounded-full bg-slate-200" /></td>
                      <td className="px-3 py-3.5">
                        <Link className="flex min-w-40 items-center gap-2.5" href={`/admin/students/${student.id}`}>
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-semibold text-indigo-700">{initials}</span>
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-slate-800 hover:text-indigo-700">{student.firstName} {student.lastName}</span>
                            <span className="block max-w-44 truncate text-[10px] text-slate-400">{parentNames.get(student.id) || "No parent linked"}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-3.5 font-mono text-xs text-slate-600">{student.admissionNumber}</td>
                      <td className="px-3 py-3.5">
                        {student.className ? <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">{student.gradeName} · {student.className}</span> : <span className="text-xs text-slate-400">—</span>}
                      </td>
                      <td className="px-3 py-3.5 text-xs text-slate-600">{student.termName || "—"}</td>
                      <td className="px-3 py-3.5 text-xs text-slate-600">{student.academicYearName || "—"}</td>
                      <td className="px-3 py-3.5"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${enrolled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{enrolled ? "Enrolled" : "Unassigned"}</span></td>
                      <td className={`px-3 py-3.5 text-right text-xs font-semibold ${Number(student.pendingInvoiceValue || 0) > 0 ? "text-rose-600" : "text-emerald-600"}`}>{formatCurrency(student.pendingInvoiceValue)}</td>
                      <td className="px-3 py-3.5 text-right"><Link className="inline-flex h-8 items-center rounded-lg px-2.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50" href={`/admin/students/${student.id}`}>Details</Link></td>
                    </tr>
                  );
                })}
                {!students.length && (
                  <tr><td className="px-6 py-16 text-center" colSpan={9}>
                    <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><UsersRound className="size-5" /></span>
                    <h3 className="mt-4 font-semibold text-slate-800">{params.q || placement || selectedClass ? "No students match these filters" : "No student records yet"}</h3>
                    <p className="mt-1 text-sm text-slate-500">{params.q || placement || selectedClass ? "Try a different search or clear a filter." : "Add the first student record to see live school data here."}</p>
                    <Link className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700" href="/admin/students/new"><Plus className="size-4" />Add student</Link>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
            <span>Showing {total ? (currentPage - 1) * PAGE_SIZE + 1 : 0}–{Math.min(currentPage * PAGE_SIZE, total)} of {total.toLocaleString()} students</span>
            <div className="flex items-center gap-1">
              <Link aria-disabled={currentPage <= 1} className={`inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 ${currentPage <= 1 ? "pointer-events-none opacity-40" : "hover:bg-slate-50"}`} href={createHref(params, { page: String(Math.max(1, currentPage - 1)) })}><ChevronLeft className="size-4" /></Link>
              <span className="px-2">Page {currentPage} of {pageCount}</span>
              <Link aria-disabled={currentPage >= pageCount} className={`inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 ${currentPage >= pageCount ? "pointer-events-none opacity-40" : "hover:bg-slate-50"}`} href={createHref(params, { page: String(Math.min(pageCount, currentPage + 1)) })}><ChevronRight className="size-4" /></Link>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Filters</h2>
              <Link className="text-xs font-medium text-indigo-600 hover:text-indigo-800" href="/admin/students">Reset</Link>
            </div>
            <div className="space-y-3">
              <FilterSelect label="Class" name="classId" value={selectedClass?.id ?? "all"}>
                <option value="all">All classes</option>
                {formOptions.classOptions.filter((item) => !selectedYear || item.academicYearId === selectedYear.id).map((item) => <option key={item.id} value={item.id}>{item.gradeName} · {item.name}</option>)}
              </FilterSelect>
              <FilterSelect label="Placement" name="placement" value={placement || "all"}>
                <option value="all">All placements</option>
                <option value="enrolled">Enrolled</option>
                <option value="unassigned">Unassigned</option>
              </FilterSelect>
            </div>
            <button className="mt-4 h-9 w-full rounded-lg bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700" type="submit">Apply filters</button>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Students by class</h2>
              <span className="text-[10px] text-slate-400">{selectedTerm?.name || selectedYear?.name || "All years"}</span>
            </div>
            {classRows.length ? (
              <div className="space-y-3">
                {classRows.map((row, index) => (
                  <Link className="group flex items-center gap-2 text-xs" href={createHref(params, { classId: String(row.classId), page: "1" })} key={row.classId}>
                    <span className="w-24 shrink-0 truncate text-slate-600 group-hover:text-indigo-700">{row.gradeName} · {row.className}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><span className={`block h-full rounded-full ${["bg-blue-400", "bg-emerald-400", "bg-violet-400", "bg-amber-400", "bg-rose-400"][index % 5]}`} style={{ width: `${Math.max(4, (row.studentCount / maxClassCount) * 100)}%` }} /></span>
                    <span className="w-7 text-right font-medium text-slate-600">{row.studentCount}</span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="rounded-lg bg-slate-50 px-3 py-5 text-center text-xs text-slate-500">No class placements in this selection.</p>
            )}
            <Link className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800" href="/admin/academic/setup#class">Manage classes <ChevronRight className="size-3" /></Link>
          </section>

          <section className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
            <p className="text-sm font-semibold text-slate-800">Missing a class or term?</p>
            <p className="mt-1 text-xs leading-5 text-slate-600">Add academic years, grades, terms, and classes to enable student placement.</p>
            <Link className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900" href="/admin/academic/setup"><Plus className="size-3.5" />School setup</Link>
          </section>
        </aside>
      </form>
    </StudentsShell>
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "blue" | "green" | "violet" | "orange";
}) {
  const styles = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    violet: "bg-violet-50 text-violet-600",
    orange: "bg-orange-50 text-orange-600",
  };
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-3">
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${styles[tone]}`}>{icon}</span>
        <div className="min-w-0">
          <p className="truncate text-xs text-slate-500">{label}</p>
          <p className="mt-1 truncate text-xl font-bold tracking-tight text-slate-900">{value}</p>
        </div>
      </div>
    </section>
  );
}

function FilterSelect({
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
      <select className="mt-1.5 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" defaultValue={value} name={name}>
        {children}
      </select>
    </label>
  );
}

async function getStudentFormOptions() {
  const [classOptions, termOptions] = await Promise.all([
    db
      .select({
        id: classes.id,
        name: classes.name,
        gradeName: gradeLevels.name,
        academicYearId: classes.academicYearId,
      })
      .from(classes)
      .innerJoin(gradeLevels, eq(classes.gradeLevelId, gradeLevels.id))
      .innerJoin(academicYears, eq(classes.academicYearId, academicYears.id))
      .orderBy(asc(academicYears.startDate), asc(gradeLevels.name), asc(classes.name)),
    db
      .select({
        id: terms.id,
        name: terms.name,
        academicYearName: academicYears.name,
        startDate: terms.startDate,
        endDate: terms.endDate,
        academicYearId: terms.academicYearId,
      })
      .from(terms)
      .innerJoin(academicYears, eq(terms.academicYearId, academicYears.id))
      .orderBy(desc(terms.startDate)),
  ]);
  return { classOptions, termOptions };
}
