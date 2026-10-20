import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  CreditCard,
  FileBarChart,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Receipt,
  Search,
  Settings,
  ShieldAlert,
  UsersRound,
  Wallet,
} from "lucide-react";
import type { DashboardData } from "@/lib/dashboard-data";
import { DashboardAcademicYearSelect } from "@/components/dashboard-academic-year-select";
import { AccountDropdown } from "@/components/account-dropdown";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/admin", active: true },
  { label: "Students", icon: UsersRound, href: "/admin/students" },
  { label: "Invoices", icon: FileText, href: "/admin/invoices" },
  { label: "Payments", icon: CreditCard, href: "/admin/payments" },
  { label: "Expenses", icon: Receipt, href: "/admin/expenses" },
  { label: "Debtors", icon: ShieldAlert, href: "/admin/reports?report=aging" },
  { label: "Statements", icon: ClipboardList, href: "/admin/reports?report=statement" },
  { label: "Reports", icon: FileBarChart, href: "/admin/reports" },
  { label: "Academic", icon: BookOpen, href: "/admin/academic/setup" },
  { label: "Settings", icon: Settings, href: "/admin/settings" },
];

const quickActions = [
  { label: "Create invoice", icon: FileText, color: "text-indigo-600 bg-indigo-50", href: "/admin/invoices/new" },
  { label: "Record payment", icon: Wallet, color: "text-emerald-600 bg-emerald-50", href: "/admin/payments" },
  { label: "Record expense", icon: Receipt, color: "text-rose-600 bg-rose-50", href: "/admin/expenses" },
  { label: "Add student", icon: UsersRound, color: "text-sky-600 bg-sky-50", href: "/admin/students/new" },
  { label: "Generate report", icon: FileBarChart, color: "text-violet-600 bg-violet-50", href: "/admin/reports" },
];

const currency = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(value);

function chartPoints(values: number[], max: number) {
  return values.map((value, index) => `${Math.round(index * (418 / 11))},${Math.round(104 - (value / max) * 90)}`).join(" ");
}

function axisCurrency(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 0 }).format(value);
}

function CollectionChart({ data }: { data: DashboardData }) {
  const scale = Math.max(1, ...data.monthlyInvoiced, ...data.monthlyPaid);
  const invoiced = chartPoints(data.monthlyInvoiced, scale);
  const received = chartPoints(data.monthlyPaid, scale);

  return (
    <div className="mt-3">
      <div className="mb-2 flex items-center justify-end gap-4 text-[10px] text-slate-500">
        <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-emerald-500" /> Received</span>
        <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-indigo-500" /> Invoiced</span>
      </div>
      <div className="relative pl-8">
        <div className="absolute inset-0 flex flex-col justify-between pb-5 text-[9px] text-slate-400">
          {[scale, scale * 0.75, scale * 0.5, scale * 0.25, 0].map((value, index) => (
            <div className="flex items-center gap-2" key={index}>
              <span className="w-8 text-right">{axisCurrency(value)}</span>
              <span className="h-px flex-1 border-t border-slate-100" />
            </div>
          ))}
        </div>
        <svg aria-label="Monthly invoiced and received fee totals from January to December" className="relative h-[142px] w-full" preserveAspectRatio="none" role="img" viewBox="0 0 418 112">
          <defs>
            <linearGradient id="received-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity=".18" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon fill="url(#received-fill)" points={`0,112 ${received} 418,112`} />
          <polyline fill="none" points={invoiced} stroke="#4f46e5" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
          <polyline fill="none" points={received} stroke="#10b981" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
          {invoiced.split(" ").map((point) => {
            const [cx, cy] = point.split(",");
            return <circle cx={cx} cy={cy} fill="white" key={`i-${point}`} r="2.5" stroke="#4f46e5" strokeWidth="2" vectorEffect="non-scaling-stroke" />;
          })}
          {received.split(" ").map((point) => {
            const [cx, cy] = point.split(",");
            return <circle cx={cx} cy={cy} fill="white" key={`r-${point}`} r="2.5" stroke="#10b981" strokeWidth="2" vectorEffect="non-scaling-stroke" />;
          })}
        </svg>
        <div className="mt-0.5 flex justify-between text-[9px] text-slate-400">
          {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((month) => <span key={month}>{month}</span>)}
        </div>
      </div>
    </div>
  );
}

function CollectionRate({ data }: { data: DashboardData }) {
  const rate = data.invoiced > 0 ? Math.min(100, Math.max(0, Math.round((data.paid / data.invoiced) * 100))) : 0;
  const circumference = 302;
  const collectedLength = (rate / 100) * circumference;
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-4 sm:flex-row sm:gap-4">
      <div className="relative size-32 shrink-0">
        <svg aria-label={`${rate} percent of invoiced fees have been collected`} className="size-full -rotate-90" role="img" viewBox="0 0 120 120">
          <circle cx="60" cy="60" fill="none" r="48" stroke="#e8edf4" strokeWidth="13" />
          <circle cx="60" cy="60" fill="none" r="48" stroke="#2ab481" strokeDasharray={`${collectedLength} ${circumference}`} strokeLinecap="round" strokeWidth="13" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[22px] font-bold tracking-tight text-slate-800">{rate}%</span>
          <span className="text-[9px] text-slate-400">Collected</span>
        </div>
      </div>
      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <span className="mt-1 size-2 rounded-full bg-emerald-500" />
          <p className="text-[10px] text-slate-500">Collected <strong className="mt-0.5 block text-xs font-semibold text-slate-800">{currency(data.paid)}</strong></p>
        </div>
        <div className="flex items-start gap-2">
          <span className="mt-1 size-2 rounded-full bg-indigo-400" />
          <p className="text-[10px] text-slate-500">Outstanding <strong className="mt-0.5 block text-xs font-semibold text-slate-800">{currency(data.outstanding)}</strong></p>
        </div>
        <div className="flex items-start gap-2">
          <span className="mt-1 size-2 rounded-full bg-slate-200" />
          <p className="text-[10px] text-slate-500">Total invoiced <strong className="mt-0.5 block text-xs font-semibold text-slate-800">{currency(data.invoiced)}</strong></p>
        </div>
      </div>
    </div>
  );
}

export function DashboardOverview({
  userName = "Alex Morgan",
  isAdmin = false,
  data,
}: {
  userName?: string;
  isAdmin?: boolean;
  data?: DashboardData;
}) {
  const reportData: DashboardData = data ?? {
    academicYearId: null, academicYears: [], academicYear: "No academic year set", school: { name: "Your School", address: "", email: "", logoData: null }, studentCount: 0, invoiced: 0, paid: 0, outstanding: 0, invoiceCount: 0,
    recentInvoices: [], debtors: [], aging: [0, 0, 0, 0], monthlyInvoiced: Array(12).fill(0), monthlyPaid: Array(12).fill(0),
  };
  const metrics = [
    { label: "Total students", value: reportData.studentCount.toLocaleString(), note: "all student records", icon: UsersRound, tone: "blue", href: "/admin/students" },
    { label: "Total invoiced", value: currency(reportData.invoiced), note: `${reportData.invoiceCount.toLocaleString()} invoices · ${reportData.academicYear}`, icon: FileText, tone: "violet", href: "/admin/invoices" },
    { label: "Payments received", value: currency(reportData.paid), note: "net paid against invoices", icon: CircleDollarSign, tone: "green", href: "/admin/payments" },
    { label: "Outstanding balance", value: currency(reportData.outstanding), note: "unpaid invoice balance", icon: ShieldAlert, tone: "rose", href: "/admin/reports?report=aging" },
  ];
  const agingLabels = ["Current (0–30 days)", "31–60 days", "61–90 days", "Over 90 days"];
  const agingColors = ["bg-emerald-400", "bg-amber-400", "bg-orange-400", "bg-rose-400"];
  const agingTotal = reportData.aging.reduce((total, amount) => total + amount, 0);
  const firstName = userName.split(/\s+/)[0] || "Administrator";
  const formattedDate = new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
  const currentYear = new Date().getFullYear();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <main className="min-h-screen bg-[#f7f9fc] text-slate-800" id="dashboard">
      <div className="flex min-h-screen">
        <input aria-label="Toggle navigation sidebar" className="peer sr-only" id="dashboard-sidebar-toggle" type="checkbox" />
        <aside className="fixed inset-y-0 left-0 z-30 flex w-[220px] shrink-0 -translate-x-full flex-col border-r border-slate-200/80 bg-white px-3 py-5 transition-transform peer-checked:translate-x-0 lg:static lg:z-auto lg:translate-x-0 peer-checked:lg:hidden">
          <Link className="mb-8 flex items-center gap-2.5 px-2" href={isAdmin ? "/admin" : "/dashboard"}>
            <span className="flex size-9 items-center justify-center rounded-xl bg-indigo-700 text-white">
              {reportData.school.logoData ? <img alt="" className="size-7 rounded-md object-contain" src={reportData.school.logoData} /> : <GraduationCap className="size-5" />}
            </span>
            <span className="min-w-0">
              <span className="block max-w-40 truncate text-[13px] font-bold tracking-tight text-slate-900">{reportData.school.name}</span>
              <span className="mt-0.5 block text-[9px] font-medium tracking-wide text-slate-400">LEARN · GROW · EXCEL</span>
            </span>
          </Link>
          <nav aria-label="Main navigation" className="space-y-1">
            {navigation.map(({ label, icon: Icon, href, active }) => (
              <Link
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[11px] transition-colors ${
                  active ? "bg-indigo-50 font-semibold text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
                href={href}
                key={label}
              >
                <Icon className="size-[15px]" strokeWidth={1.9} />
                {label}
              </Link>
            ))}
          </nav>
          <div className="mt-auto">
            <div className="overflow-hidden rounded-xl bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-3.5">
              <div aria-hidden="true" className="mb-3 flex h-20 items-center justify-center rounded-lg bg-gradient-to-br from-sky-100 to-indigo-100">
                <div className="relative flex size-14 items-end justify-center">
                  <div className="absolute bottom-1 h-9 w-11 rounded-t-md border-2 border-indigo-400 bg-white" />
                  <div className="absolute bottom-10 size-0 border-x-[22px] border-b-[13px] border-x-transparent border-b-indigo-500" />
                  <div className="absolute bottom-1 left-[18px] h-5 w-3 rounded-t bg-amber-200" />
                  <div className="absolute bottom-5 left-2 size-2 rounded-sm bg-sky-200" />
                  <div className="absolute bottom-5 right-2 size-2 rounded-sm bg-sky-200" />
                </div>
              </div>
              <p className="text-center text-[11px] font-semibold leading-4 text-slate-800">A brighter future starts with great education.</p>
              {isAdmin ? (
                <Link className="mt-3 flex h-8 w-full items-center justify-center gap-1 rounded-lg bg-indigo-600 text-[10px] text-white hover:bg-indigo-700" href="/admin/settings">
                  Manage school <ArrowRight className="size-3" />
                </Link>
              ) : (
                <Link className="mt-3 flex h-8 items-center justify-center gap-1 rounded-lg bg-indigo-600 text-[10px] font-medium text-white hover:bg-indigo-700" href="/sign-up">
                  Manage school <ArrowRight className="size-3" />
                </Link>
              )}
            </div>
            <p className="mt-5 px-2 text-[9px] text-slate-400">© {currentYear} {reportData.school.name}</p>
          </div>
        </aside>
        <label aria-label="Close navigation sidebar" className="fixed inset-0 z-20 hidden bg-slate-900/30 peer-checked:block lg:hidden" htmlFor="dashboard-sidebar-toggle" />

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 flex h-[54px] items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur sm:px-6">
            <label aria-label="Toggle navigation sidebar" className="mr-3 inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-indigo-700" htmlFor="dashboard-sidebar-toggle">
              <Menu className="size-4" />
            </label>
          <form action="/admin/students" className="relative hidden w-full max-w-[360px] sm:block" method="get">
              <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
            <input aria-label="Search students" className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50/70 pl-9 pr-12 text-[10px] outline-none placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100" name="q" placeholder="Search students..." type="search" />
          </form>
            <div className="ml-auto flex items-center gap-3">
              <Link aria-label="View payments" className="relative flex size-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100" href="/admin/payments">
                <CreditCard className="size-4" />
              </Link>
              <AccountDropdown name={userName} subtitle={isAdmin ? "Admin" : "School overview"} />
            </div>
          </header>

          <div className="mx-auto max-w-[1600px] p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-[19px] font-bold tracking-tight text-slate-900 sm:text-[21px]">{greeting}, {firstName} <span aria-hidden="true">👋</span></h1>
                <p className="mt-1 text-[11px] text-slate-500">Here&apos;s what&apos;s happening at your school today.</p>
              </div>
              <DashboardAcademicYearSelect academicYears={reportData.academicYears} selectedId={reportData.academicYearId} />
            </div>

            <div className="mb-3 grid gap-3 sm:grid-cols-4 xl:grid-cols-4">
              {metrics.map(({ label, value, note, icon: Icon, tone, href }) => (
                <Link href={href} key={label}>
                <Card className="h-full overflow-hidden rounded-xl border-0 bg-white shadow-[0_2px_8px_rgba(15,23,42,.035)] ring-1 ring-slate-200/70 transition hover:ring-indigo-200">
                  <CardContent className="p-1 sm:p-2">
                    <div className="flex items-start justify-between">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className={`flex size-4 shrink-0 items-center justify-center rounded-lg ${
                          tone === "blue" ? "bg-blue-50 text-blue-600" :
                          tone === "violet" ? "bg-violet-50 text-violet-600" :
                          tone === "green" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                        }`}><Icon className="size-4" /></span>
                        <span className="truncate text-[10px] text-slate-500">{label}</span>
                      </div>
                      <ArrowRight className="size-3.5 text-slate-300" />
                    </div>
                    <p className="mt-1.5 text-[22px] font-bold leading-none tracking-tight text-slate-900">{value}</p>
                    <p className="mt-2 text-[9px] text-slate-400">{note}</p>
                  </CardContent>
                </Card>
                </Link>
              ))}
            </div>

            <div className="mb-3 grid gap-3 xl:grid-cols-[1.55fr_0.92fr_1.05fr]">
              <Card className="rounded-xl border-0 bg-white shadow-[0_2px_8px_rgba(15,23,42,.035)] ring-1 ring-slate-200/70">
                <CardHeader className="flex flex-row items-center justify-between px-4 pb-0 pt-3.5">
                  <CardTitle className="text-[12px] font-semibold">Fee collection overview</CardTitle>
                  <Link aria-label="Open financial reports" className="rounded-md p-1 text-slate-400 hover:bg-slate-50 hover:text-indigo-600" href="/admin/reports"><MoreHorizontal className="size-4" /></Link>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <CollectionChart data={reportData} />
                </CardContent>
              </Card>

              <Card className="rounded-xl border-0 bg-white shadow-[0_2px_8px_rgba(15,23,42,.035)] ring-1 ring-slate-200/70">
                <CardHeader className="px-4 pb-0 pt-3.5">
                  <CardTitle className="text-[12px] font-semibold">Fee collection rate</CardTitle>
                </CardHeader>
                <CardContent className="px-4">
                  <CollectionRate data={reportData} />
                </CardContent>
              </Card>

              <Card className="rounded-xl border-0 bg-white shadow-[0_2px_8px_rgba(15,23,42,.035)] ring-1 ring-slate-200/70" id="debtors">
                <CardHeader className="flex flex-row items-center justify-between px-4 pb-1 pt-3.5">
                  <CardTitle className="text-[12px] font-semibold">Aging debtors</CardTitle>
                  <Link className="flex items-center gap-1 text-[9px] font-medium text-indigo-600 hover:text-indigo-800" href="/admin/reports?report=aging">View all <ArrowRight className="size-3" /></Link>
                </CardHeader>
                <CardContent className="space-y-3 px-4 pb-4 pt-2">
                  {reportData.aging.map((amount, index) => (
                    <div className="flex items-center gap-2" key={agingLabels[index]}>
                      <span className={`size-2 shrink-0 rounded-full ${agingColors[index]}`} />
                      <span className="w-[104px] shrink-0 text-[9px] text-slate-500">{agingLabels[index]}</span>
                      <span className="h-1.5 min-w-8 flex-1 overflow-hidden rounded-full bg-slate-100"><span className={`block h-full rounded-full ${agingColors[index]}`} style={{ width: `${agingTotal ? Math.round((amount / agingTotal) * 100) : 0}%` }} /></span>
                      <strong className="w-14 text-right text-[9px] font-semibold text-slate-700">{currency(amount)}</strong>
                      <span className="w-7 text-right text-[8px] text-slate-400">{agingTotal ? `${Math.round((amount / agingTotal) * 100)}%` : "0%"}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="mb-3 grid gap-3 xl:grid-cols-[1.55fr_1fr]">
              <Card className="rounded-xl border-0 bg-white shadow-[0_2px_8px_rgba(15,23,42,.035)] ring-1 ring-slate-200/70" id="invoices">
                <CardHeader className="flex flex-row items-center justify-between px-4 pb-2 pt-3.5">
                  <CardTitle className="text-[12px] font-semibold">Recent invoices</CardTitle>
                  <Link className="flex items-center gap-1 text-[9px] font-medium text-indigo-600 hover:text-indigo-800" href="/admin/invoices">View all <ArrowRight className="size-3" /></Link>
                </CardHeader>
                <CardContent className="px-2 pb-2 sm:px-3">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[580px] border-collapse text-left">
                      <thead><tr className="bg-slate-50 text-[9px] font-medium text-slate-500">
                        <th className="rounded-l-md px-2 py-2 font-medium">Invoice #</th><th className="px-2 py-2 font-medium">Student</th><th className="px-2 py-2 font-medium">Class</th><th className="px-2 py-2 font-medium">Amount</th><th className="px-2 py-2 font-medium">Status</th><th className="px-2 py-2 font-medium">Due date</th><th className="rounded-r-md px-2 py-2" />
                      </tr></thead>
                      <tbody className="divide-y divide-slate-100">
                        {reportData.recentInvoices.map((invoice) => (
                          <tr className="text-[9px] text-slate-600" key={invoice.id}>
                            <td className="whitespace-nowrap px-2 py-2.5 font-medium text-indigo-700"><Link href={`/admin/invoices/${invoice.id}`}>{invoice.number}</Link></td>
                            <td className="whitespace-nowrap px-2 py-2.5 font-medium text-slate-700">{invoice.student}</td>
                            <td className="whitespace-nowrap px-2 py-2.5">{[invoice.gradeName, invoice.className].filter(Boolean).join(" ") || "—"}</td>
                            <td className="whitespace-nowrap px-2 py-2.5 font-medium text-slate-700">{currency(invoice.amount)}</td>
                            <td className="px-2 py-2.5">
                              <Badge className={`h-4 border-0 px-1.5 text-[8px] ${
                                invoice.status === "Paid" ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-50" :
                                invoice.status === "Overdue" ? "bg-rose-50 text-rose-600 hover:bg-rose-50" :
                                invoice.status === "Partial" ? "bg-amber-50 text-amber-700 hover:bg-amber-50" :
                                invoice.status === "Cancelled" ? "bg-slate-100 text-slate-600 hover:bg-slate-100" : "bg-blue-50 text-blue-700 hover:bg-blue-50"
                              }`}>{invoice.status}</Badge>
                            </td>
                            <td className="whitespace-nowrap px-2 py-2.5">{new Intl.DateTimeFormat("en", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${invoice.dueDate}T00:00:00`))}</td>
                            <td className="px-2 py-2.5"><Link aria-label={`Open ${invoice.number}`} className="text-slate-400 hover:text-indigo-600" href={`/admin/invoices/${invoice.id}`}><ChevronRight className="size-3" /></Link></td>
                          </tr>
                        ))}
                        {reportData.recentInvoices.length === 0 && <tr><td className="px-3 py-6 text-center text-xs text-slate-400" colSpan={7}>No invoices recorded for this academic year.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-xl border-0 bg-white shadow-[0_2px_8px_rgba(15,23,42,.035)] ring-1 ring-slate-200/70" id="students">
                <CardHeader className="flex flex-row items-center justify-between px-4 pb-2 pt-3.5">
                  <CardTitle className="text-[12px] font-semibold">Top outstanding students</CardTitle>
                  <Link className="flex items-center gap-1 text-[9px] font-medium text-indigo-600 hover:text-indigo-800" href="/admin/reports?report=aging">View all <ArrowRight className="size-3" /></Link>
                </CardHeader>
                <CardContent className="px-3 pb-2">
                  <div className="grid grid-cols-[1fr_70px_74px_14px] rounded-md bg-slate-50 px-2 py-2 text-[9px] font-medium text-slate-500">
                    <span>Student</span><span>Class</span><span className="text-right">Outstanding</span><span />
                  </div>
                  <div className="divide-y divide-slate-100">
                    {reportData.debtors.map((student) => (
                      <Link className="grid grid-cols-[1fr_70px_74px_14px] items-center px-2 py-1.5 hover:bg-slate-50" href={`/admin/students/${student.studentId}`} key={student.studentId}>
                        <div className="flex min-w-0 items-center gap-2">
                          <Avatar className="size-6"><AvatarFallback className="bg-rose-50 text-[8px] font-semibold text-rose-700">{student.initials}</AvatarFallback></Avatar>
                          <span className="truncate text-[9px] font-medium text-slate-700">{student.name}</span>
                        </div>
                        <span className="text-[9px] text-slate-500">{[student.gradeName, student.className].filter(Boolean).join(" ") || "—"}</span>
                        <span className="text-right text-[9px] font-medium text-rose-600">{currency(student.balance)}</span>
                        <ChevronRight className="size-3 text-slate-400" />
                      </Link>
                    ))}
                    {reportData.debtors.length === 0 && <p className="px-2 py-6 text-center text-[10px] text-slate-400">No unpaid balances for this academic year.</p>}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-3 xl:grid-cols-[1.55fr_1fr]">
              <Card className="rounded-xl border-0 bg-white shadow-[0_2px_8px_rgba(15,23,42,.035)] ring-1 ring-slate-200/70" id="payments">
                <CardHeader className="px-4 pb-2 pt-3.5">
                  <CardTitle className="text-[12px] font-semibold">Quick actions</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2 px-3 pb-3 sm:grid-cols-4">
                  {quickActions.map(({ label, icon: Icon, color, href }) => {
                    const content = (
                      <>
                        <span className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${color}`}><Icon className="size-3.5" /></span>
                        <span className="truncate">{label}</span>
                        <ChevronRight className="ml-auto size-3 shrink-0 text-slate-400" />
                      </>
                    );

                    return (
                      <Link className="inline-flex h-10 items-center justify-start gap-2 rounded-lg border border-slate-100 bg-white px-2 text-[9px] text-slate-600 shadow-none transition-colors hover:border-indigo-100 hover:bg-indigo-50/40" href={href} key={label}>
                        {content}
                      </Link>
                    );
                  })}
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden rounded-xl border-0 bg-gradient-to-r from-indigo-50 via-blue-50 to-sky-100 shadow-[0_2px_8px_rgba(15,23,42,.035)] ring-1 ring-slate-200/70" id="reports">
                <div aria-hidden="true" className="absolute -right-3 -top-6 size-32 rounded-full bg-emerald-200/40 blur-2xl" />
                <div aria-hidden="true" className="absolute bottom-0 right-0 h-full w-2/5 bg-gradient-to-l from-emerald-100/70 to-transparent" />
                <CardContent className="relative flex min-h-[100px] items-center justify-between gap-3 p-4">
                  <div>
                    <p className="max-w-48 text-[12px] font-bold leading-4 text-slate-800">Better financial management builds a stronger school.</p>
                    <Link className="mt-2 inline-flex h-7 items-center gap-1 rounded-full bg-indigo-600 px-3 text-[9px] font-medium text-white hover:bg-indigo-700" href="/admin/reports">View reports <ArrowRight className="size-3" /></Link>
                  </div>
                  <div aria-hidden="true" className="hidden h-[74px] w-[110px] items-end justify-center gap-1 overflow-hidden rounded-lg bg-gradient-to-b from-sky-100/30 to-emerald-100/80 sm:flex">
                    <div className="h-9 w-7 rounded-t-sm bg-amber-100" />
                    <div className="relative h-12 w-12 rounded-t-md border-2 border-emerald-700/50 bg-amber-50">
                      <div className="absolute -top-3 left-1/2 size-0 -translate-x-1/2 border-x-[25px] border-b-[14px] border-x-transparent border-b-emerald-700/70" />
                      <div className="absolute inset-x-2 top-2 flex justify-between"><span className="size-1.5 bg-sky-300" /><span className="size-1.5 bg-sky-300" /></div>
                    </div>
                    <div className="h-7 w-5 rounded-t-sm bg-orange-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <footer className="mt-5 flex items-center justify-between border-t border-slate-200/70 py-3 text-[9px] text-slate-400">
              <span>© {currentYear} {reportData.school.name}</span>
              <span>{formattedDate}</span>
            </footer>
          </div>
        </section>
      </div>
    </main>
  );
}
