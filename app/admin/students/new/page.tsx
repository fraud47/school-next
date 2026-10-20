import { ArrowLeft, GraduationCap } from "lucide-react";
import Link from "next/link";
import { createStudent } from "@/app/admin/students/actions";
import { ClassPlacementFields } from "@/components/students/class-placement-fields";
import { AlertDialogForm } from "@/components/forms/alert-dialog-form";
import { StudentFeedback } from "@/components/students/student-feedback";
import { StudentsShell } from "@/components/students/students-shell";
import { requireAdminSession } from "@/lib/admin";
import { getStudentFormOptions } from "@/lib/student-data";

type SearchParams = { error?: string };

export default async function NewStudentPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [session, params, options] = await Promise.all([
    requireAdminSession(),
    searchParams,
    getStudentFormOptions(),
  ]);
  const hasPlacementOptions = options.classOptions.length > 0 && options.termOptions.length > 0;

  return (
    <StudentsShell userName={session.user.name}>
      <div className="mb-6">
        <Link className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-700" href="/admin/students">
          <ArrowLeft className="size-4" />
          Back to students
        </Link>
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">Student directory</p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Add a student</h1>
        <p className="mt-1 text-sm text-slate-500">Create a student record and optionally place them in a class for a term.</p>
      </div>

      <StudentFeedback error={params.error} />

      <AlertDialogForm title="Create student" description="Enter the student details and optional class placement." triggerLabel="Add student">
      <form action={createStudent} className="grid gap-4 sm:grid-cols-2">
        <section>
          <h2 className="text-base font-semibold text-slate-900">Student information</h2>
          <p className="mt-1 text-sm text-slate-500">Enter the student's legal name and unique admission number.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="First name" name="firstName" required />
            <Field label="Last name" name="lastName" required />
            <Field label="Admission number" name="admissionNumber" required />
            <Field label="Date of birth" name="dateOfBirth" type="date" />
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 p-4 sm:col-span-2">
          <h2 className="text-base font-semibold text-slate-900">Parent or guardian</h2>
          <p className="mt-1 text-sm text-slate-500">Optional. Add contact details to link a parent record to this student.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="First name" name="parentFirstName" />
            <Field label="Last name" name="parentLastName" />
            <Field label="Email" name="parentEmail" type="email" />
            <Field label="Phone" name="parentPhone" type="tel" />
          </div>
        </section>

        <section className="mt-2 border-t border-slate-100 pt-6 sm:col-span-2">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600"><GraduationCap className="size-5" /></span>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Class placement</h2>
              <p className="mt-1 text-sm text-slate-500">Select a class and matching academic term. The grade is determined by the selected class.</p>
            </div>
          </div>
          <div className="mt-5">
            <ClassPlacementFields classes={options.classOptions} terms={options.termOptions} />
          </div>
          {!hasPlacementOptions && (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              No class placements are available yet. Use the add buttons above to set up an academic year, term, grade, and class.
              <Link className="ml-1 font-semibold underline underline-offset-2" href="/admin/academic/setup#academic-year">Start school setup</Link>.
            </p>
          )}
        </section>

        <div className="mt-8 flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-5">
          <Link className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-slate-50" href="/admin/students">Cancel</Link>
          <button className="inline-flex h-10 items-center justify-center rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2" type="submit">Create student</button>
        </div>
      </form>
      </AlertDialogForm>
    </StudentsShell>
  );
}

function Field({
  label,
  name,
  required = false,
  type = "text",
}: {
  label: string;
  name: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}{required && <span className="text-rose-600"> *</span>}
      <input className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" name={name} required={required} type={type} />
    </label>
  );
}
