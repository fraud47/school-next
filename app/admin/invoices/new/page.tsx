import Link from "next/link";
import { InvoiceCreateForm } from "@/components/invoices/invoice-create-form";
import { StudentFeedback } from "@/components/students/student-feedback";
import { StudentsShell } from "@/components/students/students-shell";
import { requireAdminSession } from "@/lib/admin";
import { getFeeTemplateOptions, getInvoiceCreateOptions } from "@/lib/invoice-data";

type SearchParams = { error?: string };

export default async function AddInvoicePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [session, params, options, feeTemplates] = await Promise.all([
    requireAdminSession(),
    searchParams,
    getInvoiceCreateOptions(),
    getFeeTemplateOptions(),
  ]);
  const today = new Date();
  const dueDate = new Date(today);
  dueDate.setDate(dueDate.getDate() + 30);

  return (
    <StudentsShell activeSection="invoices" userName={session.user.name}>
      <StudentFeedback error={params.error} />

      {!options.years.length || !options.terms.length || !options.students.length ? (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {options.years.length === 0 || options.terms.length === 0
            ? "Set up an academic year and term before creating invoices. "
            : "Add student records before creating invoices. "}
          <Link className="font-semibold underline underline-offset-2" href="/admin/academic/setup">Open school setup</Link>
          {options.students.length === 0 && <span> or <Link className="font-semibold underline underline-offset-2" href="/admin/students/new">add a student</Link>.</span>}
        </div>
      ) : null}

      <InvoiceCreateForm
        dueDate={dueDate.toISOString().slice(0, 10)}
        invoiceDate={today.toISOString().slice(0, 10)}
        classes={options.classes}
        students={options.students}
        feeItems={options.feeItems}
        feeTemplates={feeTemplates}
        terms={options.terms}
        years={options.years}
      />
    </StudentsShell>
  );
}
