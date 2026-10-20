import Link from "next/link";
import { and, asc, count, eq } from "drizzle-orm";
import { BookOpen, GraduationCap, School, Trash2, UsersRound } from "lucide-react";
import { AlertDialogForm } from "@/components/forms/alert-dialog-form";
import { StudentsShell } from "@/components/students/students-shell";
import { db } from "@/db";
import { academicYears, classes, gradeLevels, studentClassEnrollments } from "@/db/schema";
import { requireAdminSession } from "@/lib/admin";
import { getStudentFormOptions } from "@/lib/student-data";
import { createClass, deleteClass, updateClass } from "./actions";

type ClassRow = { id: number; name: string; gradeLevelId: number; academicYearId: number; gradeName: string; yearName: string; studentCount: number };

function ClassFields({ grades, years, item }: { grades: { id: number; name: string }[]; years: { id: number; name: string }[]; item?: ClassRow }) {
  return <div className="grid gap-3 sm:grid-cols-2">
    {item && <input name="id" type="hidden" value={item.id} />}
    <label className="text-xs font-medium text-slate-700 sm:col-span-2">Class name<input className="mt-1.5 block h-10 w-full rounded-lg border border-slate-200 px-3 text-sm" defaultValue={item?.name} maxLength={100} name="name" placeholder="e.g. Grade 1A" required /></label>
    <label className="text-xs font-medium text-slate-700">Grade<select className="mt-1.5 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" defaultValue={item ? String(item.gradeLevelId) : ""} name="gradeLevelId" required><option disabled value="">Select a grade</option>{grades.map((grade) => <option key={grade.id} value={grade.id}>{grade.name}</option>)}</select></label>
    <label className="text-xs font-medium text-slate-700">Academic year<select className="mt-1.5 block h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm" defaultValue={item ? String(item.academicYearId) : ""} name="academicYearId" required><option disabled value="">Select an academic year</option>{years.map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}</select></label>
    {item?.studentCount ? <p className="text-[11px] text-slate-500 sm:col-span-2">This class has enrolled students. Its grade and academic year are locked to preserve their placement history.</p> : null}
    <div className="flex justify-end gap-2 sm:col-span-2"><button className="inline-flex h-9 items-center justify-center rounded-lg bg-indigo-600 px-4 text-xs font-semibold text-white hover:bg-indigo-700" type="submit">{item ? "Save changes" : "Create class"}</button></div>
  </div>;
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4"><span className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">{icon}</span><div><p className="text-xs text-slate-500">{label}</p><p className="text-xl font-bold text-slate-900">{value}</p></div></div>;
}

export default async function ClassesPage() {
  const [session, options, rows] = await Promise.all([
    requireAdminSession(),
    getStudentFormOptions(),
    db.select({
      id: classes.id,
      name: classes.name,
      gradeLevelId: classes.gradeLevelId,
      academicYearId: classes.academicYearId,
      gradeName: gradeLevels.name,
      yearName: academicYears.name,
      studentCount: count(studentClassEnrollments.id),
    }).from(classes)
      .innerJoin(gradeLevels, eq(classes.gradeLevelId, gradeLevels.id))
      .innerJoin(academicYears, eq(classes.academicYearId, academicYears.id))
      .leftJoin(studentClassEnrollments, eq(classes.id, studentClassEnrollments.classId))
      .groupBy(classes.id, gradeLevels.id, academicYears.id)
      .orderBy(asc(academicYears.startDate), asc(gradeLevels.name), asc(classes.name)),
  ]);
  const rowItems = rows as ClassRow[];
  const totalStudents = rowItems.reduce((sum, item) => sum + item.studentCount, 0);
  const yearsWithoutClasses = options.academicYearOptions.filter((year) => !rowItems.some((item) => item.academicYearId === year.id)).length;

  return <StudentsShell activeSection="classes" userName={session.user.name}>
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-600">School administration</p><h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Classes</h1><p className="mt-1 text-sm text-slate-500">Create and manage class groups across grades and academic years.</p></div><Link className="text-xs font-medium text-indigo-600 hover:text-indigo-800" href="/admin/academic/setup">Manage grades and academic years →</Link></div>
    <div className="mb-5 grid gap-3 sm:grid-cols-3"><Stat icon={<School className="size-5" />} label="Classes" value={rowItems.length} /><Stat icon={<UsersRound className="size-5" />} label="Current class enrollments" value={totalStudents} /><Stat icon={<BookOpen className="size-5" />} label="Years without classes" value={yearsWithoutClasses} /></div>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-5"><div><h2 className="text-sm font-semibold text-slate-900">Class list</h2><p className="mt-1 text-[11px] text-slate-500">Class records are scoped to an academic year.</p></div>{options.gradeOptions.length && options.academicYearOptions.length ? <AlertDialogForm title="Create a class" description="Assign a class name to a grade and academic year." triggerLabel="Add class"><form action={createClass}><ClassFields grades={options.gradeOptions} years={options.academicYearOptions} /></form></AlertDialogForm> : <Link className="inline-flex h-9 items-center gap-2 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white" href="/admin/academic/setup">Set up grades and years first</Link>}</div>
      {!options.gradeOptions.length || !options.academicYearOptions.length ? <div className="m-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center"><GraduationCap className="mx-auto size-7 text-slate-400" /><p className="mt-2 text-sm font-medium text-slate-700">Class setup needs grades and an academic year</p><p className="mt-1 text-xs text-slate-500">Add those records first, then create classes here.</p><Link className="mt-3 inline-flex text-xs font-semibold text-indigo-600" href="/admin/academic/setup">Open academic setup →</Link></div> : <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Class</th><th className="px-4 py-3">Grade</th><th className="px-4 py-3">Academic year</th><th className="px-4 py-3">Students</th><th className="px-4 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-100">{rowItems.map((item) => <tr key={item.id}><td className="px-4 py-3 font-semibold text-slate-800">{item.name}</td><td className="px-4 py-3 text-slate-600">{item.gradeName}</td><td className="px-4 py-3 text-slate-600">{item.yearName}</td><td className="px-4 py-3 text-slate-600">{item.studentCount}</td><td className="px-4 py-3"><div className="flex justify-end gap-2"><AlertDialogForm title={`Edit ${item.name}`} description="Update the class name, grade, or academic year." triggerLabel="Edit" triggerClassName="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50"><form action={updateClass}><ClassFields grades={options.gradeOptions} years={options.academicYearOptions} item={item} /></form></AlertDialogForm><AlertDialogForm title={`Delete ${item.name}?`} description={item.studentCount ? "This class has enrolled students and cannot be deleted." : "This permanently removes the class record."} triggerLabel="Delete" triggerClassName="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-200 px-2.5 text-[11px] font-medium text-rose-700 hover:bg-rose-50"><form action={deleteClass} className="flex items-center justify-between gap-4"><input name="id" type="hidden" value={item.id} /><p className="text-xs text-slate-600">{item.studentCount ? "Remove or move student placements before deleting this class." : "Are you sure you want to delete this class? This action cannot be undone."}</p><button className="inline-flex h-9 shrink-0 items-center gap-1 rounded-lg bg-rose-600 px-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50" disabled={Boolean(item.studentCount)} type="submit"><Trash2 className="size-3.5" />Delete</button></form></AlertDialogForm></div></td></tr>)}{!rowItems.length && <tr><td className="px-4 py-12 text-center text-slate-500" colSpan={5}>No classes yet. Add a class to begin organizing students.</td></tr>}</tbody></table></div>}
      <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-[10px] text-slate-400 sm:px-5"><span>{rowItems.length} class{rowItems.length === 1 ? "" : "es"} · {totalStudents} student enrollment{totalStudents === 1 ? "" : "s"}</span><span>Students with historical placements remain linked to their class.</span></div>
    </section>
  </StudentsShell>;
}
