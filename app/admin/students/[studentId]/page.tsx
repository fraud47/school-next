import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { ArrowLeft, CalendarDays, GraduationCap, UserRound } from "lucide-react";
import { assignStudentToClass, updateStudent } from "@/app/admin/students/actions";
import { ClassPlacementFields } from "@/components/students/class-placement-fields";
import { DeleteStudentButton } from "@/components/students/delete-student-button";
import { StudentFeedback } from "@/components/students/student-feedback";
import { StudentsShell } from "@/components/students/students-shell";
import { db } from "@/db";
import {
  academicYears,
  classes,
  gradeLevels,
  studentClassEnrollments,
  students,
  terms,
} from "@/db/schema";
import { requireAdminSession } from "@/lib/admin";
import { formatStudentDate, getStudentFormOptions } from "@/lib/student-data";
import { notFound } from "next/navigation";

type SearchParams = { error?: string; notice?: string };

export default async function StudentDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [session, routeParams, query, options] = await Promise.all([
    requireAdminSession(),
    params,
    searchParams,
    getStudentFormOptions(),
  ]);
  const studentId = /^\d+$/.test(routeParams.studentId) ? Number(routeParams.studentId) : NaN;
  if (!Number.isSafeInteger(studentId) || studentId < 1) notFound();

  const [studentRows, enrollmentRows] = await Promise.all([
    db.select().from(students).where(eq(students.id, studentId)).limit(1),
    db
      .select({
        id: studentClassEnrollments.id,
        className: classes.name,
        gradeName: gradeLevels.name,
        academicYearName: academicYears.name,
        termName: terms.name,
        enrolledAt: studentClassEnrollments.enrolledAt,
      })
      .from(studentClassEnrollments)
      .leftJoin(classes, eq(studentClassEnrollments.classId, classes.id))
      .leftJoin(gradeLevels, eq(classes.gradeLevelId, gradeLevels.id))
      .leftJoin(academicYears, eq(classes.academicYearId, academicYears.id))
      .leftJoin(terms, eq(studentClassEnrollments.termId, terms.id))
      .where(eq(studentClassEnrollments.studentId, studentId))
      .orderBy(desc(studentClassEnrollments.enrolledAt)),
  ]);
  const student = studentRows[0];
  if (!student) notFound();

  const initials = `${student.firstName[0] ?? ""}${student.lastName[0] ?? ""}`.toUpperCase();

  return (
    <StudentsShell userName={session.user.name}>
      <div className="mb-6">
        <Link className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-indigo-700" href="/admin/students">
          <ArrowLeft className="size-4" />
          Back to students
        </Link>
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-indigo-100 text-lg font-bold text-indigo-700">{initials || "ST"}</span>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-indigo-600">Student profile</p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{student.firstName} {student.lastName}</h1>
            <p className="mt-1 font-mono text-xs text-slate-500">Admission no. {student.admissionNumber}</p>
          </div>
        </div>
      </div>

      <StudentFeedback error={query.error} notice={query.notice} />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.8fr)]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-sky-50 text-sky-700"><UserRound className="size-5" /></span>
            <div>
              <h2 className="font-semibold text-slate-900">Personal details</h2>
              <p className="text-xs text-slate-500">Update the student record and admission details.</p>
            </div>
          </div>
          <form action={updateStudent} className="space-y-4">
            <input name="studentId" type="hidden" value={student.id} />
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                First name
                <input className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" defaultValue={student.firstName} name="firstName" required />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Last name
                <input className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" defaultValue={student.lastName} name="lastName" required />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Admission number
                <input className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" defaultValue={student.admissionNumber} name="admissionNumber" required />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Date of birth
                <input className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" defaultValue={student.dateOfBirth ?? ""} name="dateOfBirth" type="date" />
              </label>
            </div>
            <div className="flex justify-end border-t border-slate-100 pt-4">
              <button className="h-10 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2" type="submit">Save changes</button>
            </div>
          </form>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-rose-100 pt-5">
            <div>
              <p className="text-sm font-semibold text-slate-800">Delete student</p>
              <p className="mt-0.5 text-xs text-slate-500">This also removes class placement history. Students with invoices cannot be deleted.</p>
            </div>
            <DeleteStudentButton studentId={student.id} />
          </div>
        </section>

        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><GraduationCap className="size-5" /></span>
              <div>
                <h2 className="font-semibold text-slate-900">Class placement</h2>
                <p className="text-xs text-slate-500">Choose a class for an academic term.</p>
              </div>
            </div>
            {options.classOptions.length && options.termOptions.length ? (
              <form action={assignStudentToClass} className="space-y-4">
                <input name="studentId" type="hidden" value={student.id} />
                <ClassPlacementFields classes={options.classOptions} required terms={options.termOptions} />
                <p className="text-xs leading-5 text-slate-500">The selected class must belong to the same academic year as the term. Saving another class for an existing term updates that term's placement.</p>
                <button className="h-10 w-full rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2" type="submit">Save placement</button>
              </form>
            ) : (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">No class and term options are available yet. Set up academic years, terms, grades, and classes first.</p>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><CalendarDays className="size-5" /></span>
              <div>
                <h2 className="font-semibold text-slate-900">Enrollment history</h2>
                <p className="text-xs text-slate-500">Class placement by term.</p>
              </div>
            </div>
            {enrollmentRows.length ? (
              <ol className="divide-y divide-slate-100">
                {enrollmentRows.map((enrollment) => (
                  <li className="py-3 first:pt-0 last:pb-0" key={enrollment.id}>
                    <p className="text-sm font-semibold text-slate-800">{enrollment.gradeName || "Grade unavailable"} · {enrollment.className || "Class unavailable"}</p>
                    <p className="mt-1 text-xs text-slate-500">{enrollment.termName || "Term not recorded"}{enrollment.academicYearName ? ` · ${enrollment.academicYearName}` : ""}</p>
                    <p className="mt-1 text-xs text-slate-400">Enrolled {formatStudentDate(enrollment.enrolledAt)}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">No class placements have been recorded.</p>
            )}
          </section>
        </div>
      </div>
    </StudentsShell>
  );
}
