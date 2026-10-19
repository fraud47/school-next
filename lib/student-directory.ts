import {
  and,
  asc,
  count,
  countDistinct,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  or,
  sql,
  sum,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db";
import {
  academicYears,
  classes,
  gradeLevels,
  invoices,
  parents,
  studentClassEnrollments,
  studentParents,
  students,
  terms,
} from "@/db/schema";

export type StudentDirectoryFilters = {
  academicYearId?: number;
  termId?: number;
  classId?: number;
  placement?: "enrolled" | "unassigned";
  query?: string;
};

function enrollmentScope(filters: StudentDirectoryFilters) {
  const conditions: SQL[] = [];
  if (filters.academicYearId) {
    conditions.push(eq(classes.academicYearId, filters.academicYearId));
  }
  if (filters.termId) {
    conditions.push(eq(studentClassEnrollments.termId, filters.termId));
  }
  if (filters.classId) {
    conditions.push(eq(studentClassEnrollments.classId, filters.classId));
  }

  return db
    .selectDistinctOn([studentClassEnrollments.studentId], {
      studentId: sql<number>`${studentClassEnrollments.studentId}`.as("student_id"),
      classId: sql<number>`${classes.id}`.as("class_id"),
      className: sql<string>`${classes.name}`.as("class_name"),
      gradeName: sql<string>`${gradeLevels.name}`.as("grade_name"),
      academicYearId: sql<number>`${academicYears.id}`.as("academic_year_id"),
      academicYearName: sql<string>`${academicYears.name}`.as("academic_year_name"),
      termId: sql<number | null>`${terms.id}`.as("term_id"),
      termName: sql<string | null>`${terms.name}`.as("term_name"),
      enrolledAt: sql<string>`${studentClassEnrollments.enrolledAt}`.as("enrolled_at"),
    })
    .from(studentClassEnrollments)
    .innerJoin(classes, eq(studentClassEnrollments.classId, classes.id))
    .innerJoin(gradeLevels, eq(classes.gradeLevelId, gradeLevels.id))
    .innerJoin(academicYears, eq(classes.academicYearId, academicYears.id))
    .leftJoin(terms, eq(studentClassEnrollments.termId, terms.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(
      studentClassEnrollments.studentId,
      desc(studentClassEnrollments.enrolledAt),
      desc(studentClassEnrollments.id),
    )
    .as("student_enrollment_scope");
}

function scopedColumn<T>(name: string) {
  return sql<T>`${sql.identifier("student_enrollment_scope")}.${sql.identifier(name)}`;
}

function pendingInvoiceScope(filters: StudentDirectoryFilters) {
  const conditions: SQL[] = [eq(invoices.status, "pending")];
  if (filters.academicYearId || filters.termId) {
    conditions.push(
      filters.academicYearId
        ? eq(terms.academicYearId, filters.academicYearId)
        : sql`true`,
    );
    if (filters.termId) conditions.push(eq(invoices.termId, filters.termId));
  }

  return db
    .select({
      studentId: invoices.studentId,
      amount: sum(invoices.amount).mapWith(String).as("amount"),
    })
    .from(invoices)
    .innerJoin(terms, eq(invoices.termId, terms.id))
    .where(and(...conditions))
    .groupBy(invoices.studentId)
    .as("student_pending_invoices");
}

function directoryConditions(
  filters: StudentDirectoryFilters,
  enrollment: ReturnType<typeof enrollmentScope>,
) {
  const conditions: SQL[] = [];
  if (filters.query) {
    const pattern = `%${filters.query}%`;
    conditions.push(
      or(
        ilike(students.firstName, pattern),
        ilike(students.lastName, pattern),
        ilike(students.admissionNumber, pattern),
      )!,
    );
  }
  if (filters.placement === "enrolled") {
    conditions.push(sql`${scopedColumn<number>("student_id")} is not null`);
  } else if (filters.placement === "unassigned") {
    conditions.push(sql`${scopedColumn<number>("student_id")} is null`);
  }
  return conditions;
}

function directoryOrder(
  view: string | undefined,
  enrollment: ReturnType<typeof enrollmentScope>,
) {
  if (view === "class") {
    return [asc(scopedColumn<string>("grade_name")), asc(scopedColumn<string>("class_name")), asc(students.lastName), asc(students.firstName)] as const;
  }
  if (view === "term") {
    return [asc(scopedColumn<string | null>("term_name")), asc(students.lastName), asc(students.firstName)] as const;
  }
  if (view === "year") {
    return [desc(scopedColumn<string>("academic_year_name")), asc(students.lastName), asc(students.firstName)] as const;
  }
  return [asc(students.lastName), asc(students.firstName)] as const;
}

export async function getStudentDirectoryRows(
  filters: StudentDirectoryFilters,
  options: { limit?: number; offset?: number; view?: string } = {},
) {
  const enrollment = enrollmentScope(filters);
  const pendingInvoices = pendingInvoiceScope(filters);
  let query = db
    .select({
      id: students.id,
      firstName: students.firstName,
      lastName: students.lastName,
      admissionNumber: students.admissionNumber,
      dateOfBirth: students.dateOfBirth,
      createdAt: students.createdAt,
      classId: scopedColumn<number>("class_id"),
      className: scopedColumn<string>("class_name"),
      gradeName: scopedColumn<string>("grade_name"),
      academicYearId: scopedColumn<number>("academic_year_id"),
      academicYearName: scopedColumn<string>("academic_year_name"),
      termId: scopedColumn<number | null>("term_id"),
      termName: scopedColumn<string | null>("term_name"),
      enrolledAt: scopedColumn<string>("enrolled_at"),
      pendingInvoiceValue: pendingInvoices.amount,
    })
    .from(students)
    .leftJoin(enrollment, sql`${students.id} = ${scopedColumn<number>("student_id")}`)
    .leftJoin(pendingInvoices, eq(students.id, pendingInvoices.studentId))
    .where(and(...directoryConditions(filters, enrollment)))
    .orderBy(...directoryOrder(options.view, enrollment))
    .$dynamic();

  if (options.limit !== undefined) query = query.limit(options.limit);
  if (options.offset !== undefined) query = query.offset(options.offset);

  return query;
}

export async function countStudentDirectoryRows(filters: StudentDirectoryFilters) {
  const enrollment = enrollmentScope(filters);
  const conditions = directoryConditions(filters, enrollment);
  const [result] = await db
    .select({ total: count() })
    .from(students)
    .leftJoin(enrollment, sql`${students.id} = ${scopedColumn<number>("student_id")}`)
    .where(and(...conditions));
  return result?.total ?? 0;
}

export async function getStudentDirectoryMetrics(
  filters: StudentDirectoryFilters,
  admissionYear: { startDate: string; endDate: string } | undefined,
) {
  const enrollment = enrollmentScope(filters);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [total, enrolled, admissions, pending] = await Promise.all([
    db.select({ value: count() }).from(students),
    db
      .select({ value: countDistinct(enrollment.studentId) })
      .from(enrollment)
      .where(sql`${enrollment.studentId} is not null`),
    db
      .select({ value: count() })
      .from(students)
      .where(
        admissionYear
          ? and(
              gte(students.createdAt, new Date(`${admissionYear.startDate}T00:00:00.000Z`)),
              lte(students.createdAt, new Date(`${admissionYear.endDate}T23:59:59.999Z`)),
            )
          : gte(students.createdAt, thirtyDaysAgo),
      ),
    db
      .select({ value: sum(invoices.amount).mapWith(String) })
      .from(invoices)
      .innerJoin(terms, eq(invoices.termId, terms.id))
      .where(
        and(
          eq(invoices.status, "pending"),
          filters.termId ? eq(invoices.termId, filters.termId) : undefined,
          filters.academicYearId
            ? eq(terms.academicYearId, filters.academicYearId)
            : undefined,
        ),
      ),
  ]);

  return {
    total: total[0]?.value ?? 0,
    enrolled: enrolled[0]?.value ?? 0,
    admissions: admissions[0]?.value ?? 0,
    pendingInvoiceValue: pending[0]?.value ?? "0",
  };
}

export async function getStudentsByClass(filters: StudentDirectoryFilters) {
  const conditions: SQL[] = [];
  if (filters.academicYearId) conditions.push(eq(classes.academicYearId, filters.academicYearId));
  if (filters.termId) conditions.push(eq(studentClassEnrollments.termId, filters.termId));

  return db
    .select({
      classId: classes.id,
      className: classes.name,
      gradeName: gradeLevels.name,
      academicYearId: academicYears.id,
      studentCount: countDistinct(studentClassEnrollments.studentId),
    })
    .from(studentClassEnrollments)
    .innerJoin(classes, eq(studentClassEnrollments.classId, classes.id))
    .innerJoin(gradeLevels, eq(classes.gradeLevelId, gradeLevels.id))
    .innerJoin(academicYears, eq(classes.academicYearId, academicYears.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .groupBy(classes.id, gradeLevels.id, academicYears.id)
    .orderBy(desc(countDistinct(studentClassEnrollments.studentId)), asc(gradeLevels.name), asc(classes.name))
    .limit(8);
}

export async function getParentsForStudents(studentIds: number[]) {
  if (!studentIds.length) return new Map<number, string>();

  const rows = await db
    .select({
      studentId: studentParents.studentId,
      firstName: parents.firstName,
      lastName: parents.lastName,
    })
    .from(studentParents)
    .innerJoin(parents, eq(studentParents.parentId, parents.id))
    .where(inArray(studentParents.studentId, studentIds))
    .orderBy(asc(parents.lastName), asc(parents.firstName));
  const parentNames = new Map<number, string[]>();

  for (const row of rows) {
    const names = parentNames.get(row.studentId) ?? [];
    names.push(`${row.firstName} ${row.lastName}`);
    parentNames.set(row.studentId, names);
  }

  return new Map(
    [...parentNames].map(([studentId, names]) => [studentId, names.join(", ")]),
  );
}

export async function getAcademicYearDirectoryOptions() {
  return db
    .select({
      id: academicYears.id,
      name: academicYears.name,
      startDate: academicYears.startDate,
      endDate: academicYears.endDate,
      isCurrent: academicYears.isCurrent,
    })
    .from(academicYears)
    .orderBy(desc(academicYears.startDate));
}
