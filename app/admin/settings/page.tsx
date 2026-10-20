import Link from "next/link";
import { CalendarDays, Check, Clock3, FileText, Layers3, Plus, School, Settings2, UserCog, Wallet, X } from "lucide-react";
import { db } from "@/db";
import { academicYears, feeCatalogItems, users } from "@/db/schema";
import { AddFeeItemForm } from "@/components/settings/add-fee-item-form";
import { FeeTemplateForm } from "@/components/settings/fee-template-form";
import { StudentFeedback } from "@/components/students/student-feedback";
import { StudentsShell } from "@/components/students/students-shell";
import { requireAdminSession } from "@/lib/admin";
import { getStudentFormOptions } from "@/lib/student-data";
import { getFeeTemplateOptions } from "@/lib/invoice-data";
import { getSchoolSettings } from "@/lib/school-settings";
import { saveSchoolIdentity } from "@/app/admin/settings/actions";
import { createManagedUser, deleteManagedUser, updateManagedUser } from "@/app/admin/settings/user-actions";
import { USER_ROLES } from "@/lib/roles";
import { AlertDialogForm } from "@/components/forms/alert-dialog-form";

function money(value: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(Number(value) || 0);
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00.000Z`));
}

function Tab({ href, icon, children, active = false }: { href: string; icon: React.ReactNode; children: React.ReactNode; active?: boolean }) {
  return <Link aria-current={active ? "page" : undefined} className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-xs font-medium ${active ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:border-indigo-300 hover:text-indigo-700"}`} href={href}>{icon}{children}</Link>;
}

function SectionHeading({ icon, title, description, action }: { icon: React.ReactNode; title: string; description: string; action: React.ReactNode }) {
  return <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">{icon}</span><div><h2 className="text-sm font-semibold text-slate-900">{title}</h2><p className="mt-0.5 text-[11px] text-slate-500">{description}</p></div></div>{action}</div>;
}

function CountCard({ label, value, icon, tone = "indigo" }: { label: string; value: number; icon: React.ReactNode; tone?: "indigo" | "green" | "slate" | "blue" }) {
  const colors = { indigo: "bg-indigo-50 text-indigo-600", green: "bg-emerald-50 text-emerald-600", slate: "bg-slate-100 text-slate-600", blue: "bg-blue-50 text-blue-600" };
  return <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3"><span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${colors[tone]}`}>{icon}</span><div><p className="text-[10px] text-slate-500">{label}</p><p className="mt-0.5 text-lg font-bold text-slate-900">{value}</p></div></div>;
}

const roleLabels: Record<(typeof USER_ROLES)[number], string> = { admin: "Administrator", accountant: "Accountant", teacher: "Teacher", parent: "Parent" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string; error?: string; notice?: string }> }) {
  const [session, options, years, feeItems, feeTemplates, school, managedUsers, params] = await Promise.all([
    requireAdminSession(),
    getStudentFormOptions(),
    db.select({ id: academicYears.id, name: academicYears.name, startDate: academicYears.startDate, endDate: academicYears.endDate, isCurrent: academicYears.isCurrent }).from(academicYears).orderBy(academicYears.startDate),
    db.select({ id: feeCatalogItems.id, name: feeCatalogItems.name, description: feeCatalogItems.description, amount: feeCatalogItems.defaultAmount }).from(feeCatalogItems).orderBy(feeCatalogItems.name),
    getFeeTemplateOptions(),
    getSchoolSettings(),
    db.select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt }).from(users).orderBy(users.createdAt),
    searchParams,
  ]);
  const activeTab = ["classes", "academic-years", "fees", "general", "users"].includes(params.tab || "") ? params.tab! : "fees";

  return <StudentsShell activeSection="settings" userName={session.user.name}>
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-600">School administration</p><h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900"><Settings2 className="size-6 text-indigo-600" />Settings</h1><p className="mt-1 text-sm text-slate-500">Manage your school settings, classes, academic years and fee structures.</p></div><Link className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-50" href="/admin/academic/setup"><Settings2 className="size-3.5" />Academic setup</Link></div>

    <nav aria-label="Settings sections" className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-200"><Tab active={activeTab === "classes"} href="/admin/settings?tab=classes" icon={<School className="size-4" />}>Classes</Tab><Tab active={activeTab === "academic-years"} href="/admin/settings?tab=academic-years" icon={<CalendarDays className="size-4" />}>Academic Years</Tab><Tab active={activeTab === "fees"} href="/admin/settings?tab=fees" icon={<Layers3 className="size-4" />}>Fees Settings</Tab><Tab active={activeTab === "general"} href="/admin/settings?tab=general" icon={<Settings2 className="size-4" />}>General Settings</Tab><Tab active={activeTab === "users"} href="/admin/settings?tab=users" icon={<UserCog className="size-4" />}>User Management</Tab></nav>
    <StudentFeedback error={params.error} notice={params.notice} />

    {activeTab === "fees" && <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_280px]" id="fees">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <SectionHeading icon={<Layers3 className="size-4" />} title="Fee structure templates" description="Create reusable fee bundles for invoices, classes or academic years." action={null} />
        <AlertDialogForm title="Create a fee template" description="Choose fee items and default amounts to fill into invoices." triggerLabel="New template"><FeeTemplateForm feeItems={feeItems.map((fee) => ({ id: fee.id, name: fee.name, description: fee.description, defaultAmount: fee.amount }))} years={years} classes={options.classOptions} /></AlertDialogForm>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[600px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3">Template name</th><th className="px-3 py-3">Class</th><th className="px-3 py-3">Academic year</th><th className="px-3 py-3">Fee items</th><th className="px-3 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{feeTemplates.map((template) => <tr key={template.id}><td className="px-3 py-3 font-medium text-slate-800">{template.name}</td><td className="px-3 py-3 text-slate-600">{options.classOptions.find((item) => item.id === template.classId)?.gradeName ? `${options.classOptions.find((item) => item.id === template.classId)?.gradeName} · ${options.classOptions.find((item) => item.id === template.classId)?.name}` : "All classes"}</td><td className="px-3 py-3 text-slate-600">{years.find((year) => year.id === template.academicYearId)?.name ?? "Any year"}</td><td className="px-3 py-3 text-slate-600">{template.items.length} · {template.items.map((item) => item.name).join(", ")}</td><td className="px-3 py-3"><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] text-emerald-700">Active</span></td></tr>)}{!feeTemplates.length && <tr><td className="px-3 py-8 text-center text-slate-500" colSpan={5}>No templates created yet.</td></tr>}</tbody></table></div>
      </section>
      <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><h2 className="mb-4 text-sm font-semibold text-slate-900">Fee structure summary</h2><div className="space-y-2.5"><CountCard label="Total templates" value={feeTemplates.length} icon={<Layers3 className="size-5" />} /><CountCard label="Active templates" value={feeTemplates.filter((item) => item.status === "active").length} icon={<Check className="size-5" />} tone="green" /><CountCard label="Draft templates" value={feeTemplates.filter((item) => item.status === "draft").length} icon={<Clock3 className="size-5" />} tone="slate" /><CountCard label="Fee items" value={feeItems.length} icon={<FileText className="size-5" />} tone="blue" /></div></aside>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 xl:col-span-2">
        <SectionHeading icon={<Wallet className="size-4" />} title="Fee items" description="Manage the fee items and default amounts used when creating invoices." action={<Link className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700" href="/admin/invoices/new"><Plus className="size-3.5" />New invoice</Link>} />
        <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3"><AlertDialogForm title="Add fee item" description="Create a fee item that can be added to invoices and templates." triggerLabel="Add fee item"><AddFeeItemForm /></AlertDialogForm></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3">Fee item</th><th className="px-3 py-3">Description</th><th className="px-3 py-3 text-right">Default amount</th><th className="px-3 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{feeItems.map((fee) => <tr key={fee.id}><td className="px-3 py-3 font-medium text-slate-800">{fee.name}</td><td className="px-3 py-3 text-slate-500">{fee.description || "—"}</td><td className="px-3 py-3 text-right font-medium text-slate-700">{money(fee.amount)}</td><td className="px-3 py-3"><span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700"><Check className="size-3" />Active</span></td></tr>)}{!feeItems.length && <tr><td className="px-3 py-8 text-center text-slate-500" colSpan={4}>No fee items yet. Add one above to use it on invoices.</td></tr>}</tbody></table></div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400"><span>{feeItems.length} fee item{feeItems.length === 1 ? "" : "s"} configured</span><Link className="font-medium text-indigo-600 hover:text-indigo-800" href="/admin/invoices/new">Use these fees on an invoice →</Link></div>
      </section>
    </div>}

    {activeTab === "classes" && <div className="mt-4 grid items-start gap-4"><section className="scroll-mt-20 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" id="classes"><SectionHeading icon={<School className="size-4" />} title="Class settings" description="Manage classes, grades and academic year assignments." action={<Link className="inline-flex h-8 items-center gap-1 rounded-lg bg-indigo-600 px-2.5 text-[11px] font-semibold text-white hover:bg-indigo-700" href="/admin/classes"><Plus className="size-3.5" />Add class</Link>} /><div className="overflow-x-auto"><table className="w-full min-w-[440px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2.5">Class</th><th className="px-3 py-2.5">Grade</th><th className="px-3 py-2.5">Academic year</th><th className="px-3 py-2.5">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{options.classOptions.map((item) => <tr key={item.id}><td className="px-3 py-2.5 font-medium text-slate-800">{item.name}</td><td className="px-3 py-2.5 text-slate-600">{item.gradeName}</td><td className="px-3 py-2.5 text-slate-500">{item.academicYearName}</td><td className="px-3 py-2.5"><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] text-emerald-700">Active</span></td></tr>)}{!options.classOptions.length && <tr><td className="px-3 py-7 text-center text-slate-500" colSpan={4}>No classes configured.</td></tr>}</tbody></table></div><p className="mt-3 text-[10px] text-slate-400">{options.classOptions.length} classes · <Link className="text-indigo-600" href="/admin/classes">Manage classes</Link></p></section></div>}

    {activeTab === "academic-years" && <section className="mt-4 scroll-mt-20 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" id="academic-years"><SectionHeading icon={<CalendarDays className="size-4" />} title="Academic year settings" description="Manage academic years and terms." action={<Link className="inline-flex h-8 items-center gap-1 rounded-lg bg-indigo-600 px-2.5 text-[11px] font-semibold text-white hover:bg-indigo-700" href="/admin/academic/setup#academic-year"><Plus className="size-3.5" />Add year</Link>} /><div className="overflow-x-auto"><table className="w-full min-w-[430px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2.5">Academic year</th><th className="px-3 py-2.5">Start date</th><th className="px-3 py-2.5">End date</th><th className="px-3 py-2.5">Status</th></tr></thead><tbody className="divide-y divide-slate-100">{years.map((year) => <tr key={year.id}><td className="px-3 py-2.5 font-medium text-slate-800">{year.name}</td><td className="px-3 py-2.5 text-slate-500">{dateLabel(year.startDate)}</td><td className="px-3 py-2.5 text-slate-500">{dateLabel(year.endDate)}</td><td className="px-3 py-2.5"><span className={`rounded-full px-2 py-1 text-[10px] ${year.isCurrent ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{year.isCurrent ? "Current" : "Inactive"}</span></td></tr>)}{!years.length && <tr><td className="px-3 py-7 text-center text-slate-500" colSpan={4}>No academic years configured.</td></tr>}</tbody></table></div><p className="mt-3 text-[10px] text-slate-400">{years.length} academic years · <Link className="text-indigo-600" href="/admin/academic/setup#academic-year">Manage years &amp; terms</Link></p></section>}

    {activeTab === "general" && <section className="mt-4 scroll-mt-20 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" id="general">
      <SectionHeading icon={<Settings2 className="size-4" />} title="General settings" description="Set the school identity shown across the admin system, invoices, and receipts." action={null} />
      <form action={saveSchoolIdentity} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-xs font-medium text-slate-700">School name <input className="mt-1.5 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" defaultValue={school.name} maxLength={120} name="schoolName" required /></label>
          <label className="block text-xs font-medium text-slate-700">School email <input autoComplete="off" className="mt-1.5 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" defaultValue={school.email} inputMode="email" maxLength={254} name="schoolEmail" type="text" /></label>
          <label className="block text-xs font-medium text-slate-700 sm:col-span-2">School address <textarea className="mt-1.5 block min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" defaultValue={school.address} maxLength={300} name="schoolAddress" rows={2} /></label>
        </div>
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
          {school.logoData ? <img alt={`${school.name} logo preview`} className="size-16 rounded-lg border border-slate-200 bg-white object-contain p-1" src={school.logoData} /> : <div className="flex size-16 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-xs text-slate-400">No logo</div>}
          <div className="min-w-52 flex-1"><label className="block text-xs font-medium text-slate-700">School logo <input accept="image/png,image/jpeg,image/webp" className="mt-1.5 block w-full text-xs text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:font-medium file:text-indigo-700 hover:file:bg-indigo-100" name="schoolLogo" type="file" /></label><p className="mt-1 text-[10px] text-slate-500">PNG, JPEG, or WebP · up to 2 MB</p>{school.logoData && <label className="mt-2 inline-flex items-center gap-2 text-[10px] text-rose-700"><input name="removeSchoolLogo" type="checkbox" value="1" />Remove current logo</label>}</div>
        </div>
        <div className="flex justify-end"><button className="inline-flex h-10 items-center rounded-lg bg-indigo-600 px-5 text-xs font-semibold text-white hover:bg-indigo-700" type="submit">Save school details</button></div>
      </form>
      <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2"><div className="rounded-xl border border-slate-100 p-3"><p className="text-[10px] text-slate-500">Billing currency</p><p className="mt-1 text-sm font-semibold text-slate-800">USD ($)</p></div><div className="rounded-xl border border-slate-100 p-3"><p className="text-[10px] text-slate-500">Date display</p><p className="mt-1 text-sm font-semibold text-slate-800">English · UTC</p></div></div>
    </section>}

    {activeTab === "users" && <div className="mt-4 grid items-start gap-4" id="users">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <SectionHeading icon={<UserCog className="size-4" />} title="Create a user" description="Add a school account and assign its access role." action={null} />
        <AlertDialogForm title="Create a user" description="Add a school account and assign its access role." triggerLabel="Create user"><form action={createManagedUser} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-xs font-medium text-slate-700">Full name<input className="mt-1.5 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" maxLength={120} name="name" required /></label>
          <label className="text-xs font-medium text-slate-700">Email<input autoComplete="off" className="mt-1.5 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" inputMode="email" maxLength={254} name="email" required type="text" /></label>
          <label className="text-xs font-medium text-slate-700">Temporary password<input className="mt-1.5 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" autoComplete="new-password" minLength={8} name="password" required type="password" /></label>
          <label className="text-xs font-medium text-slate-700">Role<select className="mt-1.5 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" defaultValue="parent" name="role">{USER_ROLES.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select></label>
          <div className="flex items-end"><button className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-xs font-semibold text-white hover:bg-indigo-700"><Plus className="size-4" />Create user</button></div>
          <p className="text-[11px] text-slate-500 sm:col-span-2 lg:col-span-5">Passwords must be at least 8 characters. Share the temporary password securely so the user can sign in.</p>
        </form></AlertDialogForm>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-4 sm:px-5"><h2 className="text-sm font-semibold text-slate-900">School users <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">{managedUsers.length}</span></h2><p className="mt-1 text-[11px] text-slate-500">Update account details and roles. A user’s password can be reset from the edit row.</p></div>
        <div className="divide-y divide-slate-100">
          {managedUsers.map((user) => {
            const isCurrentUser = String(user.id) === session.user.id;
            return <div className="p-4 sm:p-5" key={user.id}>
              <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[1.1fr_1.3fr_1fr_1fr_auto_auto]">
              <form action={updateManagedUser} className="contents">
                <input name="id" type="hidden" value={user.id} />
                <label className="text-xs font-medium text-slate-700">Name<input className="mt-1.5 block h-9 w-full rounded-lg border border-slate-200 px-3 text-sm" defaultValue={user.name ?? ""} maxLength={120} name="name" required /></label>
                <label className="text-xs font-medium text-slate-700">Email<input autoComplete="off" className="mt-1.5 block h-9 w-full rounded-lg border border-slate-200 px-3 text-sm" defaultValue={user.email} inputMode="email" maxLength={254} name="email" required type="text" /></label>
                <label className="text-xs font-medium text-slate-700">Role<select className="mt-1.5 block h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm disabled:bg-slate-50" defaultValue={user.role} disabled={isCurrentUser} name="role">{USER_ROLES.map((role) => <option key={role} value={role}>{roleLabels[role]}</option>)}</select>{isCurrentUser && <input name="role" type="hidden" value="admin" />}</label>
                <label className="text-xs font-medium text-slate-700">New password <span className="font-normal text-slate-400">(optional)</span><input className="mt-1.5 block h-9 w-full rounded-lg border border-slate-200 px-3 text-sm" autoComplete="new-password" minLength={8} name="password" placeholder="Leave blank to keep current" type="password" /></label>
                <button className="inline-flex h-9 items-center justify-center rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700">Save</button>
              </form>
              {!isCurrentUser && <form action={deleteManagedUser} className="flex"><input name="id" type="hidden" value={user.id} /><button aria-label={`Delete ${user.name || user.email}`} className="inline-flex h-9 items-center justify-center rounded-lg border border-rose-200 px-3 text-rose-600 hover:bg-rose-50" title="Delete user" type="submit"><X className="size-4" /></button></form>}
              </div>
              <p className="mt-2 text-[10px] text-slate-400">{user.email} · {roleLabels[user.role]} · Added {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(user.createdAt)}{isCurrentUser ? " · You cannot change your own role or delete your account" : ""}</p>
            </div>;
          })}
          {!managedUsers.length && <p className="px-4 py-10 text-center text-sm text-slate-500">No user accounts found.</p>}
        </div>
      </section>
    </div>}
  </StudentsShell>;
}
