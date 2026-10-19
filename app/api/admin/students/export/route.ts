import { NextResponse } from "next/server";
import {
  getParentsForStudents,
  getStudentDirectoryRows,
  type StudentDirectoryFilters,
} from "@/lib/student-directory";
import { requireAdminSession } from "@/lib/admin";

function parseId(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function csvCell(value: string | number | null) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  await requireAdminSession();

  const params = new URL(request.url).searchParams;
  const placement = params.get("placement");
  const filters: StudentDirectoryFilters = {
    academicYearId: parseId(params.get("academicYearId")),
    termId: parseId(params.get("termId")),
    classId: parseId(params.get("classId")),
    placement:
      placement === "enrolled" || placement === "unassigned" ? placement : undefined,
    query: params.get("q")?.trim() || undefined,
  };
  const students = await getStudentDirectoryRows(filters);
  const parents = await getParentsForStudents(students.map((student) => student.id));
  const header = [
    "First name",
    "Last name",
    "Admission number",
    "Parent or guardian",
    "Grade",
    "Class",
    "Term",
    "Academic year",
    "Placement",
    "Pending invoice value",
  ];
  const rows = students.map((student) => [
    student.firstName,
    student.lastName,
    student.admissionNumber,
    parents.get(student.id) || "",
    student.gradeName,
    student.className,
    student.termName,
    student.academicYearName,
    student.classId ? "Enrolled" : "Unassigned",
    student.pendingInvoiceValue || "0",
  ]);
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");

  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="students.csv"',
      "Cache-Control": "no-store",
    },
  });
}
