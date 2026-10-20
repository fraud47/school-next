import Link from "next/link";
import { ArrowLeft, CalendarDays, GraduationCap, Plus, School } from "lucide-react";
import {
  createAcademicYear,
  createClass,
  createGradeLevel,
  createTerm,
} from "@/app/admin/academic/actions";
import { StudentFeedback } from "@/components/students/student-feedback";
import { AlertDialogForm } from "@/components/forms/alert-dialog-form";
import { StudentsShell } from "@/components/students/students-shell";
import { requireAdminSession } from "@/lib/admin";
import { getStudentFormOptions } from "@/lib/student-data";

type SearchParams = { error?: string; notice?: string };

export default async function AcademicSetupPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [session, params, options] = await Promise.all([
    requireAdminSession(),
    searchParams,
    getStudentFormOptions(),
  ]);

  return (
    <StudentsShell userName={session.user.name}>
      <div className="mb-6">
        <Link className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-700" href="/admin/students/new">
          <ArrowLeft className="size-4" />
          Back to add student
        </Link>
        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">School setup</p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Academic years, terms &amp; classes</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">Add the academic structure used for student placements. Create items from top to bottom: academic year, term, grade, then class.</p>
      </div>

      <StudentFeedback error={params.error} notice={params.notice} />

      <div className="grid gap-5 xl:grid-cols-2">
        <SetupCard id="academic-year" icon={<CalendarDays className="size-5" />} title="Academic year" description="Set the name and dates for a school year.">
          <AlertDialogForm title="Add academic year" description="Set the name and dates for a school year." triggerLabel="Add academic year"><form action={createAcademicYear} className="space-y-4">
            <TextField label="Name" name="name" placeholder="2026–2027" required />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Start date" name="startDate" required type="date" />
              <TextField label="End date" name="endDate" required type="date" />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input className="size-4 rounded border-slate-300 accent-indigo-600" name="isCurrent" type="checkbox" />
              Set as current academic year
            </label>
            <SubmitButton>Add academic year</SubmitButton>
          </form></AlertDialogForm>
          <OptionList items={options.academicYearOptions.map((item) => item.name)} empty="No academic years added." />
        </SetupCard>

        <SetupCard id="term" icon={<CalendarDays className="size-5" />} title="Term" description="Terms belong to one academic year and determine placement dates.">
          <AlertDialogForm title="Add term" description="Choose an academic year and set the term dates." triggerLabel="Add term"><form action={createTerm} className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Academic year
              <select className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" name="academicYearId" required>
                <option value="">Select academic year</option>
                {options.academicYearOptions.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
              </select>
            </label>
            <TextField label="Term name" name="name" placeholder="Term 1" required />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField label="Start date" name="startDate" required type="date" />
              <TextField label="End date" name="endDate" required type="date" />
            </div>
            <SubmitButton>Add term</SubmitButton>
          </form></AlertDialogForm>
          <OptionList items={options.termOptions.map((item) => `${item.name} · ${item.academicYearName}`)} empty="No terms added." />
        </SetupCard>

        <SetupCard id="grade" icon={<GraduationCap className="size-5" />} title="Grade" description="Create grade levels before adding classes.">
          <AlertDialogForm title="Add grade" description="Create a grade level for student placement." triggerLabel="Add grade"><form action={createGradeLevel} className="space-y-4">
            <TextField label="Grade name" name="name" placeholder="Grade 1" required />
            <SubmitButton>Add grade</SubmitButton>
          </form></AlertDialogForm>
          <OptionList items={options.gradeOptions.map((item) => item.name)} empty="No grades added." />
        </SetupCard>

        <SetupCard id="class" icon={<School className="size-5" />} title="Class" description="A class belongs to a grade and academic year.">
          <AlertDialogForm title="Add class" description="Create a class under a grade and academic year." triggerLabel="Add class"><form action={createClass} className="space-y-4">
            <TextField label="Class name" name="name" placeholder="1A" required />
            <label className="block text-sm font-medium text-slate-700">
              Grade
              <select className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" name="gradeLevelId" required>
                <option value="">Select grade</option>
                {options.gradeOptions.map((grade) => <option key={grade.id} value={grade.id}>{grade.name}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Academic year
              <select className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" name="academicYearId" required>
                <option value="">Select academic year</option>
                {options.academicYearOptions.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
              </select>
            </label>
            <SubmitButton>Add class</SubmitButton>
          </form></AlertDialogForm>
          <OptionList items={options.classOptions.map((item) => `${item.gradeName} · ${item.name} · ${item.academicYearName}`)} empty="No classes added." />
        </SetupCard>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link className="inline-flex h-10 items-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700" href="/admin/students/new">
          <Plus className="size-4" />
          Continue to add student
        </Link>
        <Link className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 hover:bg-slate-50" href="/admin/students">Student directory</Link>
      </div>
    </StudentsShell>
  );
}

function SetupCard({
  id,
  icon,
  title,
  description,
  children,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" id={id}>
      <div className="mb-5 flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">{icon}</span>
        <div>
          <h2 className="font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function TextField({
  label,
  name,
  placeholder,
  required = false,
  type = "text",
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" name={name} placeholder={placeholder} required={required} type={type} />
    </label>
  );
}

function SubmitButton({ children }: { children: string }) {
  return <button className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3.5 text-sm font-semibold text-white hover:bg-indigo-700" type="submit"><Plus className="size-4" />{children}</button>;
}

function OptionList({ items, empty }: { items: string[]; empty: string }) {
  return (
    <div className="mt-5 border-t border-slate-100 pt-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Existing options</p>
      {items.length ? (
        <ul className="flex flex-wrap gap-2">
          {items.map((item) => <li className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600" key={item}>{item}</li>)}
        </ul>
      ) : <p className="text-sm text-slate-400">{empty}</p>}
    </div>
  );
}
