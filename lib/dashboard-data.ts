import { and, count, countDistinct, desc, eq, lte, sql, sum } from "drizzle-orm";
import { db } from "@/db";
import { academicYears, classes, gradeLevels, invoices, payments, studentClassEnrollments, students, terms } from "@/db/schema";
import { getSchoolSettings } from "@/lib/school-settings";

const paidForInvoice = sql<number>`coalesce((select sum(p.amount) from ${payments} p where p.invoice_id = ${invoices.id}), 0)`;
const outstandingForInvoice = sql<number>`greatest(${invoices.amount} - ${paidForInvoice}, 0)`;

export async function getDashboardData(selectedAcademicYearId?: number) {
  const [yearRows, allStudentRows, school] = await Promise.all([
    db.select({ id: academicYears.id, name: academicYears.name, startDate: academicYears.startDate, endDate: academicYears.endDate })
      .from(academicYears).orderBy(desc(academicYears.isCurrent), desc(academicYears.startDate)),
    db.select({ total: count() }).from(students),
    getSchoolSettings(),
  ]);
  const firstYear = yearRows[0] as (typeof yearRows)[number] | undefined;
  const year = yearRows.find((row) => row.id === selectedAcademicYearId) ?? firstYear ?? null;
  const yearCondition = year ? eq(terms.academicYearId, year.id) : undefined;
  const studentRows = year
    ? await db.select({ total: countDistinct(studentClassEnrollments.studentId) }).from(studentClassEnrollments)
      .innerJoin(classes, eq(studentClassEnrollments.classId, classes.id)).where(eq(classes.academicYearId, year.id))
    : allStudentRows;

  const [invoiceTotals, recentInvoices, debtorRows, monthInvoices, monthPayments, agingRows] = await Promise.all([
    db.select({
      invoiced: sql<string>`coalesce(sum(case when ${invoices.status} <> 'cancelled' then ${invoices.amount} else 0 end), 0)`.mapWith(String),
      outstanding: sql<string>`coalesce(sum(case when ${invoices.status} = 'pending' then ${outstandingForInvoice} else 0 end), 0)`.mapWith(String),
      invoiceCount: sql<number>`count(*) filter (where ${invoices.status} <> 'cancelled')`.mapWith(Number),
    }).from(invoices).innerJoin(terms, eq(invoices.termId, terms.id)).where(yearCondition),
    db.select({ id: invoices.id, number: invoices.invoiceNumber, student: sql<string>`${students.firstName} || ' ' || ${students.lastName}`,
      className: classes.name, gradeName: gradeLevels.name, amount: invoices.amount, status: invoices.status,
      dueDate: invoices.dueDate, paid: paidForInvoice })
      .from(invoices).innerJoin(terms, eq(invoices.termId, terms.id)).innerJoin(students, eq(invoices.studentId, students.id))
      .leftJoin(studentClassEnrollments, and(eq(studentClassEnrollments.studentId, invoices.studentId), eq(studentClassEnrollments.termId, invoices.termId)))
      .leftJoin(classes, eq(studentClassEnrollments.classId, classes.id)).leftJoin(gradeLevels, eq(classes.gradeLevelId, gradeLevels.id))
      .where(yearCondition).orderBy(desc(invoices.createdAt), desc(invoices.id)).limit(5),
    db.select({ studentId: students.id, name: sql<string>`${students.firstName} || ' ' || ${students.lastName}`,
      className: classes.name, gradeName: gradeLevels.name, balance: sql<string>`sum(${outstandingForInvoice})`.mapWith(String) })
      .from(invoices).innerJoin(terms, eq(invoices.termId, terms.id)).innerJoin(students, eq(invoices.studentId, students.id))
      .leftJoin(studentClassEnrollments, and(eq(studentClassEnrollments.studentId, invoices.studentId), eq(studentClassEnrollments.termId, invoices.termId)))
      .leftJoin(classes, eq(studentClassEnrollments.classId, classes.id)).leftJoin(gradeLevels, eq(classes.gradeLevelId, gradeLevels.id))
      .where(and(eq(invoices.status, "pending"), yearCondition)).groupBy(students.id, classes.name, gradeLevels.name)
      .orderBy(desc(sql`sum(${outstandingForInvoice})`)).limit(5),
    db.select({ month: sql<number>`extract(month from ${invoices.createdAt})`.mapWith(Number), total: sum(invoices.amount).mapWith(String) })
      .from(invoices).innerJoin(terms, eq(invoices.termId, terms.id)).where(and(yearCondition, sql`${invoices.status} <> 'cancelled'`))
      .groupBy(sql`extract(month from ${invoices.createdAt})`),
    db.select({ month: sql<number>`extract(month from ${payments.receivedAt})`.mapWith(Number), total: sum(payments.amount).mapWith(String) })
      .from(payments).innerJoin(invoices, eq(payments.invoiceId, invoices.id)).innerJoin(terms, eq(invoices.termId, terms.id))
      .where(yearCondition).groupBy(sql`extract(month from ${payments.receivedAt})`),
    db.select({ age: sql<number>`current_date - ${invoices.createdAt}::date`.mapWith(Number), balance: sum(outstandingForInvoice).mapWith(String) })
      .from(invoices).innerJoin(terms, eq(invoices.termId, terms.id))
      .where(and(eq(invoices.status, "pending"), lte(invoices.createdAt, sql`current_date`), yearCondition))
      .groupBy(sql`current_date - ${invoices.createdAt}::date`),
  ]);

  const invoiced = Number(invoiceTotals[0]?.invoiced ?? 0);
  const outstanding = Number(invoiceTotals[0]?.outstanding ?? 0);
  const paid = Math.max(0, invoiced - outstanding);
  const monthValues = (rows: { month: number; total: string }[]) => Array.from({ length: 12 }, (_, i) => Number(rows.find((row) => row.month === i + 1)?.total ?? 0));
  const ageTotals = [0, 0, 0, 0];
  for (const row of agingRows) {
    const index = row.age <= 30 ? 0 : row.age <= 60 ? 1 : row.age <= 90 ? 2 : 3;
    ageTotals[index] += Number(row.balance ?? 0);
  }
  const debtorData = debtorRows.map((row) => ({ ...row, balance: Number(row.balance), initials: row.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase() }));

  return {
    academicYearId: year?.id ?? null,
    academicYears: yearRows.map(({ id, name }) => ({ id, name })),
    academicYear: year?.name ?? "No academic year set",
    school: { name: school.name, address: school.address, email: school.email, logoData: school.logoData },
    studentCount: studentRows[0]?.total ?? 0,
    invoiced,
    paid,
    outstanding,
    invoiceCount: invoiceTotals[0]?.invoiceCount ?? 0,
    recentInvoices: recentInvoices.map((row) => ({ ...row, amount: Number(row.amount), paid: Number(row.paid),
      status: row.status === "cancelled" ? "Cancelled" : row.status === "paid" ? "Paid" : Number(row.paid) > 0 ? "Partial" : new Date(`${row.dueDate}T00:00:00`) < new Date(new Date().toDateString()) ? "Overdue" : "Pending" })),
    debtors: debtorData,
    aging: ageTotals,
    monthlyInvoiced: monthValues(monthInvoices),
    monthlyPaid: monthValues(monthPayments),
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
