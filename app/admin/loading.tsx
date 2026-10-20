import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { ArrowLeft, CalendarDays, CreditCard, FileBarChart, FileText, GraduationCap, Receipt, School, Settings, Store, UsersRound } from "lucide-react";
import { getSchoolSettings } from "@/lib/school-settings";

export default async function AdminLoading() {
  const school = await getSchoolSettings();
  const links = [
    { label: "Students", href: "/admin/students", icon: UsersRound },
    { label: "Classes", href: "/admin/classes", icon: School },
    { label: "Terms & years", href: "/admin/academic/setup", icon: CalendarDays },
    { label: "Invoices", href: "/admin/invoices", icon: FileText },
    { label: "Payments", href: "/admin/payments", icon: CreditCard },
    { label: "Expenses", href: "/admin/expenses", icon: Receipt },
    { label: "Projects & sales", href: "/admin/products", icon: Store },
    { label: "Reports", href: "/admin/reports", icon: FileBarChart },
    { label: "Settings", href: "/admin/settings", icon: Settings },
  ];
  return (
    <main aria-label="Loading page" aria-live="polite" className="min-h-screen bg-[#f7f9fc] text-slate-800">
      <div className="flex min-h-screen">
        <aside className="hidden w-[220px] shrink-0 flex-col border-r border-slate-200/80 bg-white px-3 py-5 lg:flex">
          <Link className="mb-8 flex items-center gap-2.5 px-2" href="/admin">
            <span className="flex size-9 items-center justify-center rounded-xl bg-indigo-700 text-white">{school.logoData ? <img alt="" className="size-7 rounded-md object-contain" src={school.logoData} /> : <GraduationCap className="size-5" />}</span>
            <span><span className="block max-w-40 truncate text-[13px] font-bold tracking-tight text-slate-900">{school.name}</span><span className="mt-0.5 block text-[9px] font-medium tracking-wide text-slate-400">LEARN · GROW · EXCEL</span></span>
          </Link>
          <nav aria-label="Main navigation" className="space-y-1">
            <Link className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[11px] text-slate-600 hover:bg-slate-50" href="/admin"><ArrowLeft className="size-[15px]" />Dashboard</Link>
            {links.map(({ label, href, icon: Icon }) => <Link className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[11px] text-slate-600 hover:bg-slate-50" href={href} key={href}><Icon className="size-[15px]" />{label}</Link>)}
          </nav>
          <div className="mt-auto rounded-xl bg-indigo-50/70 p-3.5"><p className="text-[11px] font-semibold text-slate-800">Student records</p><p className="mt-1 text-[10px] leading-4 text-slate-500">Manage student details and term-by-term class placements.</p></div>
        </aside>
        <section className="min-w-0 flex-1">
          <header className="flex h-[58px] items-center justify-between border-b border-slate-200/80 bg-white px-4 sm:px-6">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="size-9 rounded-full" />
          </header>
          <div className="mx-auto max-w-[1440px] space-y-5 p-4 sm:p-6 lg:p-8">
            <div className="space-y-2"><Skeleton className="h-7 w-52" /><Skeleton className="h-4 w-80 max-w-full" /></div>
            <div className="grid gap-3 sm:grid-cols-3">{Array.from({ length: 3 }, (_, index) => <Skeleton className="h-20 rounded-xl" key={index} />)}</div>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="mb-5 flex items-center justify-between"><div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-3 w-56 max-w-full" /></div><Skeleton className="h-9 w-28 rounded-lg" /></div>
              <div className="space-y-3">{Array.from({ length: 6 }, (_, index) => <Skeleton className="h-11 w-full rounded-lg" key={index} />)}</div>
            </div>
          </div>
        </section>
      </div>
      <span className="sr-only">Loading school administration page…</span>
    </main>
  );
}
