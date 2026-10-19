import { createFeeTemplate } from "@/app/admin/settings/actions";

type Fee = { id: number; name: string; description: string | null; defaultAmount: string };
type Year = { id: number; name: string };
type ClassOption = { id: number; name: string; gradeName: string; academicYearId: number };

export function FeeTemplateForm({ feeItems, years, classes }: { feeItems: Fee[]; years: Year[]; classes: ClassOption[] }) {
  return <form action={createFeeTemplate} className="space-y-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3">
    <div><h3 className="text-xs font-semibold text-slate-900">Create a fee template</h3><p className="mt-0.5 text-[10px] text-slate-500">Choose the fee items and default amounts that will be filled into invoices.</p></div>
    <div className="grid gap-2 sm:grid-cols-3">
      <label className="text-[10px] font-medium text-slate-600">Template name<input className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-indigo-400" maxLength={100} name="name" placeholder="e.g. Term 1 tuition" required /></label>
      <label className="text-[10px] font-medium text-slate-600">Academic year<select className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-indigo-400" defaultValue="" name="academicYearId"><option value="">Any year</option>{years.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</select></label>
      <label className="text-[10px] font-medium text-slate-600">Class<select className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-indigo-400" defaultValue="" name="classId"><option value="">All classes</option>{classes.map((classItem) => <option key={classItem.id} value={classItem.id}>{classItem.gradeName} · {classItem.name}</option>)}</select></label>
    </div>
    <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2">
      {feeItems.map((fee) => <label className="grid grid-cols-[auto_minmax(0,1fr)_110px] items-center gap-2 border-b border-slate-50 py-1.5 last:border-0" key={fee.id}>
        <input className="size-3.5 accent-indigo-600" name="feeCatalogItemId" type="checkbox" value={fee.id} />
        <span className="min-w-0"><span className="block truncate text-[11px] font-medium text-slate-700">{fee.name}</span>{fee.description && <span className="block truncate text-[9px] text-slate-400">{fee.description}</span>}</span>
        <input aria-label={`${fee.name} template amount`} className="h-8 w-full rounded-md border border-slate-200 px-2 text-right text-[11px] outline-none focus:border-indigo-400" defaultValue={fee.defaultAmount} min="0.01" name={`feeAmount_${fee.id}`} required step="0.01" type="number" />
      </label>)}
      {!feeItems.length && <p className="p-3 text-center text-xs text-slate-500">Add fee items before creating a template.</p>}
    </div>
    <button className="h-8 rounded-lg bg-indigo-600 px-3 text-[11px] font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50" disabled={!feeItems.length} type="submit">Save template</button>
  </form>;
}
