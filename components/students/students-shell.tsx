import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CreditCard,
  FileText,
  FileBarChart,
  Receipt,
  Settings,
  GraduationCap,
  School,
  UsersRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { AccountDropdown } from "@/components/account-dropdown";
import { getSchoolSettings } from "@/lib/school-settings";

export async function StudentsShell({
  children,
  userName,
  activeSection = "students",
}: {
  children: ReactNode;
  userName?: string | null;
  activeSection?: "students" | "invoices" | "reports" | "settings" | "payments" | "expenses";
}) {
  const school = await getSchoolSettings();
  return (
    <main className="min-h-screen bg-[#f7f9fc] text-slate-800">
      <div className="flex min-h-screen">
        <aside className="hidden w-[220px] shrink-0 flex-col border-r border-slate-200/80 bg-white px-3 py-5 lg:flex print:hidden">
          <Link className="mb-8 flex items-center gap-2.5 px-2" href="/admin">
            <span className="flex size-9 items-center justify-center rounded-xl bg-indigo-700 text-white">
              {school.logoData ? <img alt="" className="size-7 rounded-md object-contain" src={school.logoData} /> : <GraduationCap className="size-5" />}
            </span>
            <span>
              <span className="block max-w-40 truncate text-[13px] font-bold tracking-tight text-slate-900">{school.name}</span>
              <span className="mt-0.5 block text-[9px] font-medium tracking-wide text-slate-400">LEARN · GROW · EXCEL</span>
            </span>
          </Link>
          <nav aria-label="Main navigation" className="space-y-1">
            <Link className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[11px] text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900" href="/admin">
              <ArrowLeft className="size-[15px]" />
              Dashboard
            </Link>
            <Link aria-current={activeSection === "students" ? "page" : undefined} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[11px] transition-colors ${activeSection === "students" ? "bg-indigo-50 font-semibold text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`} href="/admin/students">
              <UsersRound className="size-[15px]" />
              Students
            </Link>
            <Link className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[11px] text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900" href="/admin/academic/setup#class">
              <School className="size-[15px]" />
              Classes
            </Link>
            <Link className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[11px] text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900" href="/admin/academic/setup#term">
              <CalendarDays className="size-[15px]" />
              Terms &amp; years
            </Link>
            <Link aria-current={activeSection === "invoices" ? "page" : undefined} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[11px] transition-colors ${activeSection === "invoices" ? "bg-indigo-50 font-semibold text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`} href="/admin/invoices">
              <FileText className="size-[15px]" />
              Invoices
            </Link>
            <Link aria-current={activeSection === "payments" ? "page" : undefined} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[11px] transition-colors ${activeSection === "payments" ? "bg-indigo-50 font-semibold text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`} href="/admin/payments">
              <CreditCard className="size-[15px]" />
              Payments
            </Link>
            <Link aria-current={activeSection === "expenses" ? "page" : undefined} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[11px] transition-colors ${activeSection === "expenses" ? "bg-indigo-50 font-semibold text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`} href="/admin/expenses">
              <Receipt className="size-[15px]" />
              Expenses
            </Link>
            <Link aria-current={activeSection === "reports" ? "page" : undefined} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[11px] transition-colors ${activeSection === "reports" ? "bg-indigo-50 font-semibold text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`} href="/admin/reports">
              <FileBarChart className="size-[15px]" />
              Reports
            </Link>
            <Link aria-current={activeSection === "settings" ? "page" : undefined} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[11px] transition-colors ${activeSection === "settings" ? "bg-indigo-50 font-semibold text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`} href="/admin/settings">
              <Settings className="size-[15px]" />
              Settings
            </Link>
          </nav>
          <div className="mt-auto rounded-xl bg-indigo-50/70 p-3.5">
            <p className="text-[11px] font-semibold text-slate-800">Student records</p>
            <p className="mt-1 text-[10px] leading-4 text-slate-500">Manage student details and term-by-term class placements.</p>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 flex h-[58px] items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur sm:px-6 print:hidden">
            <Link className="flex items-center gap-2 text-sm font-semibold text-slate-800 lg:hidden" href="/admin">
              {school.logoData ? <img alt="" className="size-7 object-contain" src={school.logoData} /> : <GraduationCap className="size-5 text-indigo-700" />}
              <span className="max-w-40 truncate">{school.name}</span>
            </Link>
            <Link className="hidden items-center gap-2 text-xs font-medium text-slate-500 hover:text-indigo-700 lg:flex" href="/admin">
              <ArrowLeft className="size-3.5" />
              Back to dashboard
            </Link>
            <div className="ml-auto flex items-center gap-2">
              <AccountDropdown name={userName || "Administrator"} subtitle="School account" />
            </div>
          </header>
          <div className="mx-auto max-w-[1440px] p-4 sm:p-6 lg:p-8 print:max-w-none print:p-0">{children}</div>
        </section>
      </div>
    </main>
  );
}
