import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  lt,
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
  feeCatalogItems,
  feeTemplateItems,
  feeTemplates,
  gradeLevels,
  invoices,
  invoiceItems,
  payments,
  studentClassEnrollments,
  students,
  terms,
} from "@/db/schema";

export type InvoiceFilters = {
  academicYearId?: number;
  termId?: number;
  classId?: number;
  status?: "paid" | "pending" | "cancelled" | "overdue";
  query?: string;
};

function invoiceConditions(filters: InvoiceFilters) {
  const conditions: SQL[] = [];
  if (filters.academicYearId) conditions.push(eq(terms.academicYearId, filters.academicYearId));
  if (filters.termId) conditions.push(eq(invoices.termId, filters.termId));
  if (filters.classId) conditions.push(eq(classes.id, filters.classId));
  if (filters.status === "paid" || filters.status === "pending" || filters.status === "cancelled") {
    conditions.push(eq(invoices.status, filters.status));
  } else if (filters.status === "overdue") {
    conditions.push(eq(invoices.status, "pending"));
    conditions.push(lt(invoices.dueDate, new Date().toISOString().slice(0, 10)));
  }
  if (filters.query) {
    const pattern = `%${filters.query}%`;
    conditions.push(or(
      ilike(invoices.invoiceNumber, pattern),
      ilike(students.firstName, pattern),
      ilike(students.lastName, pattern),
      ilike(students.admissionNumber, pattern),
    )!);
  }
  return conditions;
}

function enrollmentJoinCondition() {
  return and(
    eq(studentClassEnrollments.studentId, invoices.studentId),
    eq(studentClassEnrollments.termId, invoices.termId),
  );
}

export async function getInvoiceList(filters: InvoiceFilters, options: { limit: number; offset: number }) {
  return db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      studentId: students.id,
      studentFirstName: students.firstName,
      studentLastName: students.lastName,
      admissionNumber: students.admissionNumber,
      className: classes.name,
      gradeName: gradeLevels.name,
      termId: terms.id,
      termName: terms.name,
      academicYearId: academicYears.id,
      academicYearName: academicYears.name,
      invoiceDate: invoices.createdAt,
      dueDate: invoices.dueDate,
      amount: invoices.amount,
      status: invoices.status,
    })
    .from(invoices)
    .innerJoin(students, eq(invoices.studentId, students.id))
    .innerJoin(terms, eq(invoices.termId, terms.id))
    .innerJoin(academicYears, eq(terms.academicYearId, academicYears.id))
    .leftJoin(studentClassEnrollments, enrollmentJoinCondition())
    .leftJoin(classes, eq(studentClassEnrollments.classId, classes.id))
    .leftJoin(gradeLevels, eq(classes.gradeLevelId, gradeLevels.id))
    .where(and(...invoiceConditions(filters)))
    .orderBy(desc(invoices.createdAt), desc(invoices.id))
    .limit(options.limit)
    .offset(options.offset);
}

export async function countInvoices(filters: InvoiceFilters) {
  const [result] = await db
    .select({ total: count() })
    .from(invoices)
    .innerJoin(students, eq(invoices.studentId, students.id))
    .innerJoin(terms, eq(invoices.termId, terms.id))
    .innerJoin(academicYears, eq(terms.academicYearId, academicYears.id))
    .leftJoin(studentClassEnrollments, enrollmentJoinCondition())
    .leftJoin(classes, eq(studentClassEnrollments.classId, classes.id))
    .where(and(...invoiceConditions(filters)));
  return result?.total ?? 0;
}

export async function getInvoiceMetrics(filters: InvoiceFilters) {
  const [result] = await db
    .select({
      totalCount: count(),
      totalAmount: sum(invoices.amount).mapWith(String),
      paidAmount: sql<string>`coalesce(sum(case
        when ${invoices.status} = 'paid' and not exists (select 1 from ${payments} p where p.invoice_id = ${invoices.id}) then ${invoices.amount}
        else (select coalesce(sum(p.amount), 0) from ${payments} p where p.invoice_id = ${invoices.id})
      end), 0)`.mapWith(String),
      pendingAmount: sql<string>`coalesce(sum(case when ${invoices.status} = 'pending' then greatest(${invoices.amount} - (select coalesce(sum(p.amount), 0) from ${payments} p where p.invoice_id = ${invoices.id}), 0) else 0 end), 0)`.mapWith(String),
      paidCount: sql<number>`count(*) filter (where ${invoices.status} = 'paid')`.mapWith(Number),
    })
    .from(invoices)
    .innerJoin(students, eq(invoices.studentId, students.id))
    .innerJoin(terms, eq(invoices.termId, terms.id))
    .innerJoin(academicYears, eq(terms.academicYearId, academicYears.id))
    .leftJoin(studentClassEnrollments, enrollmentJoinCondition())
    .leftJoin(classes, eq(studentClassEnrollments.classId, classes.id))
    .where(and(...invoiceConditions({
      academicYearId: filters.academicYearId,
      termId: filters.termId,
      classId: filters.classId,
    })));

  const [pendingResult] = await db
    .select({
      pendingCount: count(),
    })
    .from(invoices)
    .innerJoin(terms, eq(invoices.termId, terms.id))
    .leftJoin(studentClassEnrollments, enrollmentJoinCondition())
    .leftJoin(classes, eq(studentClassEnrollments.classId, classes.id))
    .where(and(
      eq(invoices.status, "pending"),
      filters.academicYearId ? eq(terms.academicYearId, filters.academicYearId) : undefined,
      filters.termId ? eq(invoices.termId, filters.termId) : undefined,
      filters.classId ? eq(classes.id, filters.classId) : undefined,
    ));

  return {
    totalCount: result?.totalCount ?? 0,
    totalAmount: result?.totalAmount ?? "0",
    paidAmount: result?.paidAmount ?? "0",
    pendingAmount: result?.pendingAmount ?? "0",
    paidCount: result?.paidCount ?? 0,
    pendingCount: pendingResult?.pendingCount ?? 0,
  };
}

export async function getInvoiceFilterOptions() {
  const [years, allTerms, classesOptions] = await Promise.all([
    db
      .select({
        id: academicYears.id,
        name: academicYears.name,
        isCurrent: academicYears.isCurrent,
      })
      .from(academicYears)
      .orderBy(desc(academicYears.startDate)),
    db
      .select({
        id: terms.id,
        name: terms.name,
        academicYearId: terms.academicYearId,
        academicYearName: academicYears.name,
      })
      .from(terms)
      .innerJoin(academicYears, eq(terms.academicYearId, academicYears.id))
      .orderBy(desc(terms.startDate)),
    db
      .select({
        id: classes.id,
        name: classes.name,
        gradeName: gradeLevels.name,
        academicYearId: classes.academicYearId,
      })
      .from(classes)
      .innerJoin(gradeLevels, eq(classes.gradeLevelId, gradeLevels.id))
      .orderBy(asc(gradeLevels.name), asc(classes.name)),
  ]);
  return { years, terms: allTerms, classes: classesOptions };
}

export async function getInvoiceCreateOptions() {
  const [years, allTerms, classesOptions, studentsWithEnrollments, feeOptions] = await Promise.all([
    db
      .select({
        id: academicYears.id,
        name: academicYears.name,
        isCurrent: academicYears.isCurrent,
      })
      .from(academicYears)
      .orderBy(desc(academicYears.startDate)),
    db
      .select({
        id: terms.id,
        name: terms.name,
        academicYearId: terms.academicYearId,
      })
      .from(terms)
      .orderBy(asc(terms.startDate)),
    db
      .select({
        id: classes.id,
        name: classes.name,
        gradeName: gradeLevels.name,
        academicYearId: classes.academicYearId,
      })
      .from(classes)
      .innerJoin(gradeLevels, eq(classes.gradeLevelId, gradeLevels.id))
      .orderBy(asc(gradeLevels.name), asc(classes.name)),
    db
      .select({
        id: students.id,
        firstName: students.firstName,
        lastName: students.lastName,
        admissionNumber: students.admissionNumber,
        termId: studentClassEnrollments.termId,
        classId: classes.id,
        className: classes.name,
        gradeName: gradeLevels.name,
        academicYearId: classes.academicYearId,
      })
      .from(students)
      .leftJoin(studentClassEnrollments, eq(students.id, studentClassEnrollments.studentId))
      .leftJoin(classes, eq(studentClassEnrollments.classId, classes.id))
      .leftJoin(gradeLevels, eq(classes.gradeLevelId, gradeLevels.id))
      .orderBy(asc(students.lastName), asc(students.firstName)),
    db
      .select({
        id: feeCatalogItems.id,
        name: feeCatalogItems.name,
        description: feeCatalogItems.description,
        defaultAmount: feeCatalogItems.defaultAmount,
      })
      .from(feeCatalogItems)
      .orderBy(asc(feeCatalogItems.name)),
  ]);
  return { years, terms: allTerms, classes: classesOptions, students: studentsWithEnrollments, feeItems: feeOptions };
}

export async function getFeeTemplateOptions() {
  const templates = await db
    .select({
      id: feeTemplates.id,
      name: feeTemplates.name,
      academicYearId: feeTemplates.academicYearId,
      classId: feeTemplates.classId,
      status: feeTemplates.status,
    })
    .from(feeTemplates)
    .where(eq(feeTemplates.status, "active"))
    .orderBy(asc(feeTemplates.name));
  if (!templates.length) return [];
  const items = await db
    .select({
      templateId: feeTemplateItems.templateId,
      feeTypeId: feeCatalogItems.id,
      name: feeCatalogItems.name,
      description: feeCatalogItems.description,
      amount: feeTemplateItems.amount,
    })
    .from(feeTemplateItems)
    .innerJoin(feeCatalogItems, eq(feeTemplateItems.feeCatalogItemId, feeCatalogItems.id))
    .where(inArray(feeTemplateItems.templateId, templates.map((template) => template.id)))
    .orderBy(asc(feeTemplateItems.id));
  const itemsByTemplate = new Map<number, typeof items>();
  for (const item of items) {
    const current = itemsByTemplate.get(item.templateId) ?? [];
    current.push(item);
    itemsByTemplate.set(item.templateId, current);
  }
  return templates.map((template) => ({
    ...template,
    items: itemsByTemplate.get(template.id) ?? [],
  }));
}

export async function getInvoiceDetails(invoiceId: number) {
  const [invoice] = await db
    .select({
      id: invoices.id,
      invoiceNumber: invoices.invoiceNumber,
      invoiceDate: invoices.createdAt,
      dueDate: invoices.dueDate,
      amount: invoices.amount,
      notes: invoices.notes,
      status: invoices.status,
      studentId: students.id,
      firstName: students.firstName,
      lastName: students.lastName,
      admissionNumber: students.admissionNumber,
      termName: terms.name,
      academicYearName: academicYears.name,
      className: classes.name,
      gradeName: gradeLevels.name,
    })
    .from(invoices)
    .innerJoin(students, eq(invoices.studentId, students.id))
    .innerJoin(terms, eq(invoices.termId, terms.id))
    .innerJoin(academicYears, eq(terms.academicYearId, academicYears.id))
    .leftJoin(studentClassEnrollments, enrollmentJoinCondition())
    .leftJoin(classes, eq(studentClassEnrollments.classId, classes.id))
    .leftJoin(gradeLevels, eq(classes.gradeLevelId, gradeLevels.id))
    .where(eq(invoices.id, invoiceId))
    .limit(1);

  if (!invoice) return null;
  const items = await db
    .select({
      name: invoiceItems.name,
      description: invoiceItems.description,
      amount: invoiceItems.amount,
    })
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, invoiceId));
  const [paymentTotal] = await db
    .select({ paidAmount: sum(payments.amount).mapWith(String) })
    .from(payments)
    .where(eq(payments.invoiceId, invoiceId));
  const paidAmount = paymentTotal?.paidAmount ?? "0";
  const balance = Math.max(0, Number(invoice.amount) - Number(paidAmount));
  return { ...invoice, items, paidAmount, balance };
}

export async function getInvoiceItems(invoiceIds: number[]) {
  if (!invoiceIds.length) return [];
  return db
    .select({
      invoiceId: invoiceItems.invoiceId,
      name: invoiceItems.name,
      description: invoiceItems.description,
      amount: invoiceItems.amount,
    })
    .from(invoiceItems)
    .where(inArray(invoiceItems.invoiceId, invoiceIds));
}
