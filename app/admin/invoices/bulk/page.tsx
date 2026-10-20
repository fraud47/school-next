import Link from "next/link";
import { ArrowLeft, FileStack, UsersRound } from "lucide-react";
import { createBulkInvoices } from "@/app/admin/invoices/bulk/actions";
import { StudentFeedback } from "@/components/students/student-feedback";
import { AlertDialogForm } from "@/components/forms/alert-dialog-form";
import { StudentsShell } from "@/components/students/students-shell";
import { requireAdminSession } from "@/lib/admin";
import { getFeeTemplateOptions, getInvoiceCreateOptions } from "@/lib/invoice-data";
import { getStudentFormOptions } from "@/lib/student-data";

function money(value: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value) || 0);
}

export default async function BulkInvoicesPage({ searchParams }: { searchParams: Promise<{ error?: string; created?: string }> }) {
  const [session, params, options, templates, studentOptions] = await Promise.all([
    requireAdminSession(),
    searchParams,
    getInvoiceCreateOptions(),
    getFeeTemplateOptions(),
    getStudentFormOptions(),
  ]);
  const currentYear = options.years.find((year) => year.isCurrent) ?? options.years[0];
  const term = options.terms.find((item) => item.academicYearId === currentYear?.id);
  const today = new Date().toISOString().slice(0, 10);
  const dueDate = new Date(`${today}T00:00:00.000Z`);
  dueDate.setUTCDate(dueDate.getUTCDate() + 30);
  const usableTemplates = templates.filter((template) => !template.classId);
  const createdCount = params.created && /^\d+$/.test(params.created) ? Number(params.created) : 0;

  return <StudentsShell activeSection="invoices" userName={session.user.name}>
    <div className="mb-5"><div className="mb-2 flex items-center gap-2 text-xs text-slate-400"><Link className="hover:text-indigo-700" href="/admin/invoices">Invoices</Link><span>›</span><span className="text-slate-600">Bulk invoicing</span></div><p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-600">School billing</p><h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Create bulk invoices</h1><p className="mt-1 text-sm text-slate-500">Issue the same fee invoice to every student enrolled in a selected grade or across the school.</p></div>
    <StudentFeedback error={params.error} />
    {createdCount > 0 && <p className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">Created {createdCount} invoices successfully. Each student has an individual invoice and balance.</p>}

    {(!options.years.length || !options.terms.length || !options.students.length) ? <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">Set up an academic year, term, and enrolled students before creating bulk invoices. <Link className="font-semibold underline" href="/admin/academic/setup">Open school setup</Link></section> : <AlertDialogForm title="Create bulk invoices" description="Choose enrolled students and the fee items to apply to each invoice." triggerLabel="Create bulk invoices"><form action={createBulkInvoices} className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><UsersRound className="size-4" /></span><div><h2 className="text-sm font-semibold text-slate-900">Choose recipients</h2><p className="mt-0.5 text-[11px] text-slate-500">Only students enrolled in the selected term will receive invoices.</p></div></div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs font-medium text-slate-700">Academic year<select className="mt-1.5 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" defaultValue={currentYear?.id ?? ""} name="academicYearId" required>{options.years.map((year) => <option key={year.id} value={year.id}>{year.name}{year.isCurrent ? " · Current" : ""}</option>)}</select></label>
          <label className="text-xs font-medium text-slate-700">Term<select className="mt-1.5 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" defaultValue={term?.id ?? ""} name="termId" required>{options.terms.map((item) => <option key={item.id} value={item.id}>{item.name} · {options.years.find((year) => year.id === item.academicYearId)?.name ?? "Academic year"}</option>)}</select></label>
          <label className="text-xs font-medium text-slate-700">Students to invoice<select className="mt-1.5 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" defaultValue="" name="gradeLevelId"><option value="">All enrolled students</option>{studentOptions.gradeOptions.map((grade) => <option key={grade.id} value={grade.id}>Grade {grade.name}</option>)}</select></label>
        </div>
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-slate-50 p-3 text-[11px] leading-5 text-slate-600"><FileStack className="mt-0.5 size-4 shrink-0 text-indigo-600" />The target list is based on class placements for the selected term. All-school invoicing excludes students without an active term placement.</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="mb-1 text-sm font-semibold text-slate-900">Invoice details</h2><p className="mb-4 text-[11px] text-slate-500">Choose a shared template or manually select fee items for each invoice.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs font-medium text-slate-700 sm:col-span-3">Fee template (optional)<select className="mt-1.5 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" defaultValue="" name="templateId"><option value="">Choose fee items manually below</option>{usableTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}{template.academicYearId ? ` · ${options.years.find((year) => year.id === template.academicYearId)?.name ?? "Year-specific"}` : " · Any year"} · {template.items.length} items</option>)}</select></label>
          <label className="text-xs font-medium text-slate-700">Invoice date<input className="mt-1.5 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" defaultValue={today} name="invoiceDate" required type="date" /></label>
          <label className="text-xs font-medium text-slate-700">Due date<input className="mt-1.5 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" defaultValue={dueDate.toISOString().slice(0, 10)} min={today} name="dueDate" required type="date" /></label>
          <label className="text-xs font-medium text-slate-700 sm:col-span-3">Notes (optional)<textarea className="mt-1.5 block min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" maxLength={500} name="notes" placeholder="Shared note shown on each invoice" /></label>
        </div>
        <div className="mt-4 rounded-xl border border-slate-100"><div className="border-b border-slate-100 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Manual fee items</div>{options.feeItems.map((fee) => <label className="grid grid-cols-[20px_1fr_130px] items-center gap-3 border-b border-slate-100 px-3 py-2.5 last:border-0" key={fee.id}><input className="size-4 accent-indigo-600" name="feeCatalogItemId" type="checkbox" value={fee.id} /><span><span className="block text-xs font-medium text-slate-800">{fee.name}</span><span className="block text-[10px] text-slate-500">{fee.description || "School fee item"}</span></span><span><span className="mb-1 block text-[9px] text-slate-500">Amount per student</span><input className="h-8 w-full rounded-md border border-slate-200 px-2 text-xs" defaultValue={fee.defaultAmount} min="0.01" name={`feeAmount_${fee.id}`} step="0.01" type="number" /></span></label>)}{!options.feeItems.length && <p className="p-4 text-xs text-slate-500">Add fee items or create a general fee template in <Link className="text-indigo-600 underline" href="/admin/settings?tab=fees">Settings → Fees Settings</Link>.</p>}</div>
        <p className="mt-3 text-[10px] text-slate-500">A fee template takes precedence over manually selected items. Fee amounts are copied to each student’s invoice.</p>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-2"><Link className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-xs font-medium text-slate-600 hover:bg-slate-50" href="/admin/invoices"><ArrowLeft className="size-3.5" />Cancel</Link><button className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-5 text-xs font-semibold text-white hover:bg-indigo-700" type="submit"><UsersRound className="size-4" />Create invoices</button></div>
    </form></AlertDialogForm>}
  </StudentsShell>;
}
