"use client";

import { useMemo, useState } from "react";
import { Check, CreditCard, ReceiptText, RotateCcw } from "lucide-react";
import { recordPayment } from "@/app/admin/payments/actions";

type InvoiceOption = {
  id: number;
  invoiceNumber: string;
  studentId: number;
  studentFirstName: string;
  studentLastName: string;
  admissionNumber: string;
  termName: string;
  academicYearName: string;
  amount: string;
  paidAmount: number;
  balance: number;
};

const inputClass = "mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";
const money = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(value);

export function PaymentCaptureForm({ invoices, receivedDate }: { invoices: InvoiceOption[]; receivedDate: string }) {
  const [studentId, setStudentId] = useState("");
  const [invoiceId, setInvoiceId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [date, setDate] = useState(receivedDate);
  const students = useMemo(() => {
    const unique = new Map<number, InvoiceOption>();
    invoices.forEach((invoice) => unique.set(invoice.studentId, invoice));
    return [...unique.values()].sort((a, b) => a.studentFirstName.localeCompare(b.studentFirstName) || a.studentLastName.localeCompare(b.studentLastName));
  }, [invoices]);
  const studentInvoices = invoices.filter((invoice) => String(invoice.studentId) === studentId);
  const selectedInvoice = invoices.find((invoice) => String(invoice.id) === invoiceId);

  function selectStudent(value: string) {
    setStudentId(value);
    const first = invoices.find((invoice) => String(invoice.studentId) === value);
    setInvoiceId(first ? String(first.id) : "");
    setAmount(first ? first.balance.toFixed(2) : "");
  }

  function selectInvoice(value: string) {
    setInvoiceId(value);
    const invoice = invoices.find((entry) => String(entry.id) === value);
    setAmount(invoice ? invoice.balance.toFixed(2) : "");
  }

  function clear() {
    setStudentId("");
    setInvoiceId("");
    setAmount("");
    setMethod("cash");
    setDate(receivedDate);
  }

  return <form action={recordPayment} className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,.8fr)]">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 border-b border-slate-100 pb-3"><h2 className="text-base font-semibold text-slate-900">Payment details</h2><p className="mt-1 text-xs text-slate-500">Record a full or partial payment against a student invoice.</p></div>
      {!invoices.length ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">There are no unpaid invoices to receive payment for.</div> : <>
        <label className="block text-sm font-medium text-slate-700">Student <span className="text-rose-500">*</span><select className={inputClass} onChange={(event) => selectStudent(event.target.value)} required value={studentId}><option value="">Select a student</option>{students.map((student) => <option key={student.studentId} value={student.studentId}>{student.admissionNumber} · {student.studentFirstName} {student.studentLastName}</option>)}</select></label>
        <label className="mt-4 block text-sm font-medium text-slate-700">Invoice <span className="text-rose-500">*</span><select className={inputClass} disabled={!studentId} name="invoiceId" onChange={(event) => selectInvoice(event.target.value)} required value={invoiceId}><option value="">Select an invoice</option>{studentInvoices.map((invoice) => <option key={invoice.id} value={invoice.id}>{invoice.invoiceNumber} · {invoice.termName} {invoice.academicYearName} · balance {money(invoice.balance)}</option>)}</select></label>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">Amount <span className="text-rose-500">*</span><input className={inputClass} max={selectedInvoice?.balance} min="0.01" name="amount" onChange={(event) => setAmount(event.target.value)} required step="0.01" type="number" value={amount} /></label>
          <label className="block text-sm font-medium text-slate-700">Received date <span className="text-rose-500">*</span><input className={inputClass} name="receivedDate" onChange={(event) => setDate(event.target.value)} required type="date" value={date} /></label>
        </div>
        <label className="mt-4 block text-sm font-medium text-slate-700">Payment method <span className="text-rose-500">*</span><select className={inputClass} name="method" onChange={(event) => setMethod(event.target.value)} required value={method}><option value="cash">Cash</option><option value="bank_transfer">Bank transfer</option><option value="ecocash">EcoCash</option><option value="card">Card</option><option value="other">Other</option></select></label>
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50/60 p-3 text-xs text-blue-800"><ReceiptText className="size-4 shrink-0" />A unique receipt reference will be generated when you record this payment.</div>
        <div className="mt-6 flex justify-end gap-2"><button className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50" onClick={clear} type="button"><RotateCcw className="size-4" />Clear</button><button className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50" disabled={!selectedInvoice || !amount || Number(amount) <= 0 || Number(amount) > (selectedInvoice?.balance ?? 0)} type="submit"><CreditCard className="size-4" />Record payment</button></div>
      </>}
    </section>

    <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><div className="mb-4 border-b border-slate-100 pb-3"><h2 className="text-base font-semibold text-slate-900">Student summary</h2><p className="mt-1 text-xs text-slate-500">Invoice balance and payment summary</p></div>
      {selectedInvoice ? <><div className="py-3 text-center"><span className="mx-auto flex size-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600"><span className="text-sm font-bold">{selectedInvoice.studentFirstName[0]}{selectedInvoice.studentLastName[0]}</span></span><h3 className="mt-3 text-lg font-semibold text-slate-900">{selectedInvoice.studentFirstName} {selectedInvoice.studentLastName}</h3><p className="mt-1 text-sm text-slate-500">Admission No. {selectedInvoice.admissionNumber}</p></div><div className="mt-3 rounded-xl border border-slate-200 p-4"><div className="flex items-center justify-between gap-2"><div><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Invoice</p><p className="mt-1 text-sm font-semibold text-slate-800">{selectedInvoice.invoiceNumber}</p><p className="text-xs text-slate-500">{selectedInvoice.termName} · {selectedInvoice.academicYearName}</p></div><span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">Outstanding</span></div><div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-sm"><div className="flex justify-between"><span className="text-slate-500">Invoice total</span><span>{money(Number(selectedInvoice.amount))}</span></div><div className="flex justify-between"><span className="text-slate-500">Paid so far</span><span className="text-emerald-700">{money(selectedInvoice.paidAmount)}</span></div><div className="flex justify-between border-t border-slate-100 pt-2 font-bold"><span>Remaining balance</span><span className="text-rose-600">{money(selectedInvoice.balance)}</span></div></div></div><div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800"><Check className="size-4" />Receipt amount will be applied to this invoice.</div></> : <div className="flex min-h-56 flex-col items-center justify-center text-center"><span className="flex size-12 items-center justify-center rounded-xl bg-slate-50 text-slate-400"><ReceiptText className="size-5" /></span><p className="mt-3 text-sm font-medium text-slate-700">Select a student and invoice</p><p className="mt-1 max-w-xs text-xs leading-5 text-slate-500">The invoice amount, payments received and current balance will appear here.</p></div>}
    </aside>
  </form>;
}
