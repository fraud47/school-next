"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  CalendarDays,
  Check,
  ChevronDown,
  Circle,
  ClipboardList,
  FileText,
  Lightbulb,
  Plus,
  ReceiptText,
  Search,
  Trash2,
  UserRound,
  MessageSquareText,
} from "lucide-react";
import { createFeeCatalogItem, createInvoice } from "@/app/admin/invoices/actions";

type YearOption = { id: number; name: string; isCurrent: boolean };
type TermOption = { id: number; name: string; academicYearId: number };
type ClassOption = { id: number; name: string; gradeName: string; academicYearId: number };
type StudentOption = {
  id: number;
  firstName: string;
  lastName: string;
  admissionNumber: string;
  termId: number | null;
  classId: number | null;
  className: string | null;
  gradeName: string | null;
  academicYearId: number | null;
};
type FeeOption = { id: number; name: string; description: string | null; defaultAmount: string };
type FeeLine = { key: number; feeTypeId: string };
type FeeTemplateOption = {
  id: number;
  name: string;
  academicYearId: number | null;
  classId: number | null;
  items: { feeTypeId: number; name: string; description: string | null; amount: string }[];
};

function formatMoney(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(amount);
}

function initials(student: StudentOption) {
  return `${student.firstName[0] ?? ""}${student.lastName[0] ?? ""}`.toUpperCase();
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0 text-[11px] font-medium text-slate-600">
      {label}
      {children}
    </label>
  );
}

const inputClass = "mt-1.5 h-9 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

export function InvoiceCreateForm({
  years,
  terms,
  classes,
  students,
  feeItems: initialFeeItems,
  feeTemplates,
  invoiceDate,
  dueDate,
}: {
  years: YearOption[];
  terms: TermOption[];
  classes: ClassOption[];
  students: StudentOption[];
  feeItems: FeeOption[];
  feeTemplates: FeeTemplateOption[];
  invoiceDate: string;
  dueDate: string;
}) {
  const defaultYear = years.find((year) => year.isCurrent) ?? years[0];
  const initialTerm = terms.find((term) => term.academicYearId === defaultYear?.id);
  const [academicYearId, setAcademicYearId] = useState(defaultYear ? String(defaultYear.id) : "");
  const [termId, setTermId] = useState(initialTerm ? String(initialTerm.id) : "");
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [studentQuery, setStudentQuery] = useState("");
  const [feeItems, setFeeItems] = useState(initialFeeItems);
  const [items, setItems] = useState<FeeLine[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [nextKey, setNextKey] = useState(0);
  const [amounts, setAmounts] = useState<Record<number, string>>({});
  const [descriptions, setDescriptions] = useState<Record<number, string>>({});
  const [selectedInvoiceDate, setSelectedInvoiceDate] = useState(invoiceDate);
  const [selectedDueDate, setSelectedDueDate] = useState(dueDate);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [creatingFeeKey, setCreatingFeeKey] = useState<number | null>(null);
  const [newFeeName, setNewFeeName] = useState("");
  const [newFeeDescription, setNewFeeDescription] = useState("");
  const [newFeeAmount, setNewFeeAmount] = useState("");
  const [feeFeedback, setFeeFeedback] = useState("");
  const [isCreatingFee, startCreatingFee] = useTransition();

  const availableTerms = terms.filter((term) => String(term.academicYearId) === academicYearId);
  const availableClasses = classes.filter((classItem) => String(classItem.academicYearId) === academicYearId);
  const availableTemplates = feeTemplates.filter((template) =>
    (!template.academicYearId || String(template.academicYearId) === academicYearId) &&
    (!template.classId || String(template.classId) === classId),
  );
  const studentGroups = useMemo(() => {
    const grouped = new Map<number, { student: StudentOption; enrollments: StudentOption[] }>();
    for (const student of students) {
      const record = grouped.get(student.id) ?? { student, enrollments: [] };
      if (student.classId && student.termId) record.enrollments.push(student);
      grouped.set(student.id, record);
    }
    return [...grouped.values()];
  }, [students]);
  const availableStudents = studentGroups.filter(({ enrollments }) => {
    if (enrollments.length === 0) return !classId;
    return enrollments.some((enrollment) =>
      String(enrollment.termId) === termId &&
      String(enrollment.academicYearId) === academicYearId &&
      (!classId || String(enrollment.classId) === classId),
    );
  });
  const filteredStudents = availableStudents.filter(({ student }) =>
    `${student.firstName} ${student.lastName} ${student.admissionNumber}`
      .toLowerCase()
      .includes(studentQuery.trim().toLowerCase()),
  );
  const selectedStudentGroup = studentGroups.find(({ student }) => String(student.id) === studentId);
  const selectedStudent = selectedStudentGroup?.student;
  const selectedPlacement = selectedStudentGroup?.enrollments.find((enrollment) =>
    String(enrollment.termId) === termId &&
    String(enrollment.academicYearId) === academicYearId &&
    (!classId || String(enrollment.classId) === classId),
  );
  const totalCents = Object.values(amounts).reduce((sum, value) => {
    if (!/^\d+(\.\d{1,2})?$/.test(value)) return sum;
    const [whole, fraction = ""] = value.split(".");
    return sum + Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  }, 0);
  const total = totalCents / 100;

  function changeYear(value: string) {
    setAcademicYearId(value);
    const firstTerm = terms.find((term) => String(term.academicYearId) === value);
    setTermId(firstTerm ? String(firstTerm.id) : "");
    setClassId("");
    setStudentId("");
    setSelectedTemplateId("");
  }

  function selectFee(key: number, value: string, options = feeItems) {
    const selected = options.find((fee) => String(fee.id) === value);
    setItems((current) => current.map((line) => line.key === key ? { ...line, feeTypeId: value } : line));
    setAmounts((current) => ({ ...current, [key]: selected?.defaultAmount ?? "" }));
    setDescriptions((current) => ({ ...current, [key]: selected?.description ?? "" }));
    setFeeFeedback("");
  }

  function addFeeRow() {
    const key = nextKey;
    const defaultFee = feeItems[0];
    setItems((current) => [...current, { key, feeTypeId: defaultFee ? String(defaultFee.id) : "" }]);
    setNextKey((current) => current + 1);
    if (defaultFee) {
      setAmounts((current) => ({ ...current, [key]: defaultFee.defaultAmount }));
      setDescriptions((current) => ({ ...current, [key]: defaultFee.description ?? "" }));
    } else {
      setCreatingFeeKey(key);
    }
    setFeeFeedback("");
  }

  function applyFeeTemplate(templateId: string) {
    setSelectedTemplateId(templateId);
    const template = feeTemplates.find((item) => String(item.id) === templateId);
    if (!template) {
      setItems([]);
      setAmounts({});
      setDescriptions({});
      return;
    }
    const rows = template.items.map((item, index) => ({ key: nextKey + index, feeTypeId: String(item.feeTypeId) }));
    setItems(rows);
    setAmounts(Object.fromEntries(template.items.map((item, index) => [nextKey + index, item.amount])));
    setDescriptions(Object.fromEntries(template.items.map((item, index) => [nextKey + index, item.description ?? ""])));
    setNextKey((current) => current + template.items.length);
    setFeeFeedback(`${template.name} applied. You can adjust individual fees before creating the invoice.`);
  }

  function saveNewFee() {
    setFeeFeedback("");
    startCreatingFee(async () => {
      try {
        if (!newFeeName.trim() || !/^\d{1,10}(\.\d{1,2})?$/.test(newFeeAmount.trim())) {
          setFeeFeedback("Enter a fee name and a valid amount.");
          return;
        }
        const result = await createFeeCatalogItem(newFeeName, newFeeDescription, newFeeAmount);
        if (!result.ok) {
          setFeeFeedback(result.error);
          return;
        }
        const updatedFees = feeItems.some((fee) => fee.id === result.item.id)
          ? feeItems
          : [...feeItems, result.item].sort((a, b) => a.name.localeCompare(b.name));
        setFeeItems(updatedFees);
        if (creatingFeeKey !== null) {
          setItems((current) => current.map((line) =>
            line.key === creatingFeeKey ? { ...line, feeTypeId: String(result.item.id) } : line,
          ));
          setAmounts((current) => ({ ...current, [creatingFeeKey]: result.item.defaultAmount }));
          setDescriptions((current) => ({ ...current, [creatingFeeKey]: result.item.description ?? "" }));
        }
        setCreatingFeeKey(null);
        setNewFeeName("");
        setNewFeeDescription("");
        setNewFeeAmount("");
        setFeeFeedback(result.alreadyExists ? "Fee already exists and has been selected." : "Fee created and added.");
      } catch (error) {
        if (error instanceof Error) setFeeFeedback(error.message);
        else throw error;
      }
    });
  }

  return (
    <form action={createInvoice} className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
      <input name="academicYearId" type="hidden" value={academicYearId} />
      <input name="termId" type="hidden" value={termId} />
      <input name="classId" type="hidden" value={classId} />
      <input name="studentId" type="hidden" value={studentId} />
      <input name="invoiceNumber" type="hidden" value={invoiceNumber} />
      <input name="notes" type="hidden" value={notes} />

      <div className="flex flex-wrap items-end justify-between gap-3 xl:col-span-2">
        <div>
          <p className="text-[10px] text-slate-400">Invoices <span className="px-1">›</span> Add Invoice</p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900">Add New Invoice</h1>
          <p className="mt-0.5 text-[11px] text-slate-500">Create a new school fee invoice for a student.</p>
        </div>
        <div className="flex gap-2">
          <CompactSelect label="Academic Year" value={academicYearId} onChange={changeYear}>
            <option value="">Select year</option>
            {years.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
          </CompactSelect>
          <CompactSelect label="Term" value={termId} onChange={(value) => {
            setTermId(value);
            setStudentId("");
          }}>
            <option value="">Select term</option>
            {availableTerms.map((term) => <option key={term.id} value={term.id}>{term.name}</option>)}
          </CompactSelect>
          <CompactSelect label="Class" value={classId} onChange={(value) => {
            setClassId(value);
            setStudentId("");
          }}>
            <option value="">All Classes</option>
            {availableClasses.map((classItem) => <option key={classItem.id} value={classItem.id}>{classItem.gradeName} {classItem.name}</option>)}
          </CompactSelect>
        </div>
      </div>

      <div className="space-y-3">
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><span className="flex size-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><UserRound className="size-4" /></span>Student Information</h2>
              <p className="mt-0.5 text-[11px] text-slate-500">Select a student to create an invoice for.</p>
            </div>
          </div>

          <label className="relative block">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
            <span className="sr-only">Search for a student by name, admission number or ID</span>
            <input
              className="h-9 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              onChange={(event) => setStudentQuery(event.target.value)}
              placeholder="Search for a student by name, admission number or ID..."
              type="search"
              value={studentQuery}
            />
          </label>

          {selectedStudent ? (
            <div className="mt-2 flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2.5">
              <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">{initials(selectedStudent)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-slate-900">{selectedStudent.firstName} {selectedStudent.lastName}</span>
                <span className="block truncate text-[10px] text-slate-500">Admission No: {selectedStudent.admissionNumber} {selectedPlacement?.gradeName ? ` · Grade ${selectedPlacement.gradeName}` : ""}</span>
              </span>
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-[9px] font-semibold text-emerald-700">Active</span>
              <button aria-label="Change selected student" className="rounded p-1 text-slate-500 hover:bg-slate-100" onClick={() => setStudentId("")} type="button"><ChevronDown className="size-4" /></button>
            </div>
          ) : (
            <div className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-slate-200">
              {filteredStudents.slice(0, 8).map(({ student, enrollments }) => {
                const placement = enrollments.find((enrollment) =>
                  String(enrollment.termId) === termId &&
                  String(enrollment.academicYearId) === academicYearId &&
                  (!classId || String(enrollment.classId) === classId),
                );
                return (
                  <button className="flex w-full items-center gap-3 border-b border-slate-100 p-2 text-left last:border-0 hover:bg-indigo-50" key={student.id} onClick={() => {
                    setStudentId(String(student.id));
                    setStudentQuery("");
                  }} type="button">
                    <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">{initials(student)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-slate-900">{student.firstName} {student.lastName}</span>
                      <span className="block truncate text-[10px] text-slate-500">Admission No: {student.admissionNumber}{placement?.gradeName ? ` · Grade ${placement.gradeName}` : ""}</span>
                    </span>
                    <span className="text-[10px] text-emerald-700">Active</span>
                  </button>
                );
              })}
              {!filteredStudents.length && <p className="p-3 text-center text-[11px] text-slate-500">{studentQuery ? "No students match this search." : "No students are available for this academic period."}</p>}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><span className="flex size-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><FileText className="size-4" /></span>Invoice Details</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">Set the academic period and invoice dates.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Academic Year *">
              <select className={inputClass} onChange={(event) => changeYear(event.target.value)} required value={academicYearId}>
                <option value="">Select year</option>
                {years.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
              </select>
            </Field>
            <Field label="Term *">
              <select className={inputClass} disabled={!academicYearId} onChange={(event) => {
                setTermId(event.target.value);
                setStudentId("");
              }} required value={termId}>
                <option value="">Select term</option>
                {availableTerms.map((term) => <option key={term.id} value={term.id}>{term.name}</option>)}
              </select>
            </Field>
            <Field label="Class">
              <select className={inputClass} onChange={(event) => {
                setClassId(event.target.value);
                setStudentId("");
                setSelectedTemplateId("");
              }} value={classId}>
                <option value="">All Classes</option>
                {availableClasses.map((classItem) => <option key={classItem.id} value={classItem.id}>{classItem.gradeName} {classItem.name}</option>)}
              </select>
            </Field>
            <Field label="Invoice Date *">
              <span className="relative block">
                <CalendarDays className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                <input className={`${inputClass} pl-8`} name="invoiceDate" onChange={(event) => {
                  setSelectedInvoiceDate(event.target.value);
                  if (selectedDueDate < event.target.value) setSelectedDueDate(event.target.value);
                }} required type="date" value={selectedInvoiceDate} />
              </span>
            </Field>
            <Field label="Due Date *">
              <span className="relative block">
                <CalendarDays className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                <input className={`${inputClass} pl-8`} min={selectedInvoiceDate} name="dueDate" onChange={(event) => setSelectedDueDate(event.target.value)} required type="date" value={selectedDueDate} />
              </span>
            </Field>
            <Field label="Reference Number">
              <input className={inputClass} maxLength={80} onChange={(event) => setInvoiceNumber(event.target.value)} placeholder="Generated if left blank" value={invoiceNumber} />
            </Field>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><span className="flex size-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><ReceiptText className="size-4" /></span>Fee Items</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">Add the fees for this invoice. You can add multiple items and adjust amounts.</p>
            </div>
            <label className="block w-full text-[10px] font-medium text-slate-600 sm:w-64">Apply fee template
              <select className={`${inputClass} mt-1`} onChange={(event) => applyFeeTemplate(event.target.value)} value={selectedTemplateId}>
                <option value="">Choose a template…</option>
                {availableTemplates.map((template) => <option key={template.id} value={template.id}>{template.name} · {template.items.length} items</option>)}
              </select>
            </label>
          </div>
          <div className="hidden grid-cols-[minmax(120px,1fr)_minmax(130px,1.2fr)_110px_28px] gap-2 rounded-md bg-slate-50 px-2 py-2 text-[9px] font-medium text-slate-500 sm:grid">
            <span>Fee Item</span><span>Description</span><span>Amount (USD)</span><span className="sr-only">Actions</span>
          </div>
          <div className="mt-1 space-y-1.5">
            {items.map((item, index) => (
              <div className="grid grid-cols-[minmax(0,1fr)_28px] items-center gap-2 rounded-md border border-slate-100 p-2 sm:grid-cols-[minmax(120px,1fr)_minmax(130px,1.2fr)_110px_28px] sm:border-0 sm:p-0" key={item.key}>
                <label className="block min-w-0">
                  <span className="sr-only">Fee item {index + 1}</span>
                  <select className={`${inputClass} mt-0`} name="itemFeeTypeId" onChange={(event) => {
                    if (event.target.value === "__create_fee__") {
                      setCreatingFeeKey(item.key);
                      setFeeFeedback("");
                      return;
                    }
                    selectFee(item.key, event.target.value);
                  }} required value={item.feeTypeId}>
                    <option value="">Select Fee Item</option>
                    {feeItems.map((fee) => <option key={fee.id} value={fee.id}>{fee.name}</option>)}
                    <option value="__create_fee__">Create new fee type…</option>
                  </select>
                </label>
                <label className="col-span-1 block min-w-0 sm:col-span-1">
                  <span className="sr-only">Description</span>
                  <input className={`${inputClass} mt-0`} maxLength={240} name="itemDescription" onChange={(event) => setDescriptions((current) => ({ ...current, [item.key]: event.target.value }))} placeholder="Fee description" value={descriptions[item.key] ?? ""} />
                </label>
                <label className="col-span-1 block min-w-0 sm:col-span-1">
                  <span className="sr-only">Amount (USD)</span>
                  <span className="relative block">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">$</span>
                    <input className={`${inputClass} mt-0 pl-6`} inputMode="decimal" min="0.01" name="itemAmount" onChange={(event) => setAmounts((current) => ({ ...current, [item.key]: event.target.value }))} placeholder="0.00" required step="0.01" type="number" value={amounts[item.key] ?? ""} />
                  </span>
                </label>
                <button aria-label={`Remove fee item ${index + 1}`} className="row-span-3 inline-flex size-7 items-center justify-center rounded text-rose-500 hover:bg-rose-50 sm:row-span-1" onClick={() => {
                  setItems((current) => current.filter((line) => line.key !== item.key));
                  setAmounts((current) => {
                    const next = { ...current };
                    delete next[item.key];
                    return next;
                  });
                  setDescriptions((current) => {
                    const next = { ...current };
                    delete next[item.key];
                    return next;
                  });
                  if (creatingFeeKey === item.key) setCreatingFeeKey(null);
                }} type="button"><Trash2 className="size-3.5" /></button>
                {creatingFeeKey === item.key && (
                  <div className="col-span-2 grid gap-2 rounded-md border border-indigo-100 bg-indigo-50/40 p-3 sm:col-span-3 sm:grid-cols-3">
                    <input aria-label="New fee name" className={inputClass} maxLength={100} onChange={(event) => setNewFeeName(event.target.value)} placeholder="New fee name" value={newFeeName} />
                    <input aria-label="New fee description" className={inputClass} maxLength={240} onChange={(event) => setNewFeeDescription(event.target.value)} placeholder="Description" value={newFeeDescription} />
                    <div className="flex gap-2">
                      <input aria-label="New fee default amount" className={inputClass} min="0.01" onChange={(event) => setNewFeeAmount(event.target.value)} placeholder="Default amount" step="0.01" type="number" value={newFeeAmount} />
                      <button className="mt-1.5 h-9 shrink-0 rounded-md bg-indigo-600 px-3 text-[10px] font-semibold text-white disabled:opacity-50" disabled={isCreatingFee} onClick={saveNewFee} type="button">{isCreatingFee ? "Saving…" : "Save"}</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          {feeFeedback && <p aria-live="polite" className="mt-2 text-[10px] text-emerald-700">{feeFeedback}</p>}
          <button className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-md border border-indigo-300 px-3 text-[10px] font-semibold text-indigo-700 hover:bg-indigo-50" onClick={addFeeRow} type="button"><Plus className="size-3" />Add Fee Item</button>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><span className="flex size-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><MessageSquareText className="size-4" /></span>Additional Notes</h2>
          <p className="mt-0.5 text-[11px] text-slate-500">Add any additional notes or instructions for this invoice (optional).</p>
          <textarea className="mt-3 min-h-16 w-full resize-y rounded-md border border-slate-200 p-2.5 text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" maxLength={500} onChange={(event) => setNotes(event.target.value)} placeholder="e.g. Payment instructions, discounts, or special notes..." value={notes} />
          <p className="mt-1 text-right text-[9px] text-slate-400">{notes.length}/500</p>
        </section>

        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3">
          <Link className="inline-flex h-9 items-center rounded-md border border-slate-200 px-4 text-xs font-medium text-slate-600 hover:bg-slate-50" href="/admin/invoices">Cancel</Link>
          <button className="inline-flex h-9 items-center gap-2 rounded-md bg-indigo-600 px-5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50" disabled={!studentId || !termId || items.length === 0 || items.some((item) => !item.feeTypeId) || total <= 0} type="submit"><FileText className="size-3.5" />Create Invoice</button>
        </div>
      </div>

      <aside className="space-y-3 xl:sticky xl:top-20">
        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="rounded-md bg-indigo-50 px-2.5 py-2 text-xs font-semibold text-indigo-900">Invoice Summary</h2>
          {selectedStudent ? (
            <div className="mt-3 flex items-center gap-2.5">
              <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">{initials(selectedStudent)}</span>
              <span>
                <span className="block text-[11px] font-semibold text-slate-900">{selectedStudent.firstName} {selectedStudent.lastName}</span>
                <span className="block text-[9px] text-slate-500">{selectedPlacement?.gradeName ? `Grade ${selectedPlacement.gradeName}` : "No class"} · {availableTerms.find((term) => String(term.id) === termId)?.name}</span>
              </span>
            </div>
          ) : <p className="mt-3 text-[10px] text-slate-500">Select a student</p>}
          <div className="mt-3 space-y-2 border-b border-slate-100 pb-3">
            {items.map((item, index) => (
              <div className="flex items-center justify-between gap-2 text-[10px]" key={item.key}>
                <span className="truncate text-slate-600">{feeItems.find((fee) => String(fee.id) === item.feeTypeId)?.name || `Fee item ${index + 1}`}</span>
                <span className="shrink-0 font-medium text-slate-800">{formatMoney(Number(amounts[item.key] || 0))}</span>
              </div>
            ))}
            {!items.length && <p className="text-[10px] text-slate-400">No fees added yet.</p>}
          </div>
          <div className="flex items-center justify-between pt-3">
            <span className="text-xs font-bold text-slate-800">Total Amount</span>
            <span className="text-lg font-bold text-slate-900">{formatMoney(total)}</span>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-md border border-emerald-100 bg-emerald-50 p-2.5 text-[9px] text-emerald-800">
            <Check className="size-4 shrink-0 rounded-full bg-emerald-600 p-0.5 text-white" />
            <span>This invoice will be marked as <strong className="ml-1 rounded-full bg-emerald-100 px-2 py-0.5 uppercase">Unpaid</strong></span>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="flex items-center gap-2 text-xs font-semibold text-slate-900"><Lightbulb className="size-4 text-indigo-600" />Quick Tips</h2>
          <ul className="mt-3 space-y-2 text-[9px] leading-4 text-slate-500">
            <li className="flex gap-2"><Check className="mt-0.5 size-3 shrink-0 text-indigo-500" />You can add multiple fee items to an invoice.</li>
            <li className="flex gap-2"><Check className="mt-0.5 size-3 shrink-0 text-indigo-500" />The due date helps track due payments.</li>
            <li className="flex gap-2"><Check className="mt-0.5 size-3 shrink-0 text-indigo-500" />You can edit or void an invoice later if needed.</li>
          </ul>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="flex items-center gap-2 text-xs font-semibold text-slate-900"><ClipboardList className="size-4 text-indigo-600" />Invoice Status</h2>
          <ol className="mt-3 space-y-2.5">
            <WorkflowStep active label="1. Create Invoice" />
            <WorkflowStep label="2. Record Payment" />
            <WorkflowStep label="3. Track Balance" />
            <WorkflowStep label="4. Send Statement" />
          </ol>
        </section>
      </aside>
    </form>
  );
}

function CompactSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="hidden min-w-24 text-[8px] text-slate-500 sm:block">
      {label}
      <select className="mt-0.5 h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-[10px] text-slate-700 outline-none focus:border-indigo-400" onChange={(event) => onChange(event.target.value)} value={value}>
        {children}
      </select>
    </label>
  );
}

function WorkflowStep({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <li className={`flex items-center gap-2 text-[9px] ${active ? "font-semibold text-indigo-700" : "text-slate-400"}`}>
      {active ? <span className="flex size-4 items-center justify-center rounded-full bg-indigo-600 text-white"><Check className="size-2.5" /></span> : <Circle className="size-4 text-slate-300" />}
      {label}
    </li>
  );
}
