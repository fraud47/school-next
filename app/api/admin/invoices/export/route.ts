import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin";
import { getInvoiceList, type InvoiceFilters } from "@/lib/invoice-data";

function parseId(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function cell(value: string | number | Date | null) {
  const output = value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? "");
  return `"${output.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  await requireAdminSession();
  const params = new URL(request.url).searchParams;
  const status = params.get("status");
  const filters: InvoiceFilters = {
    academicYearId: parseId(params.get("academicYearId")),
    termId: parseId(params.get("termId")),
    classId: parseId(params.get("classId")),
    status: status === "paid" || status === "pending" || status === "cancelled" || status === "overdue" ? status : undefined,
    query: params.get("q")?.trim() || undefined,
  };
  const invoices = await getInvoiceList(filters, {
    limit: 10000,
    offset: 0,
  });
  const header = [
    "Invoice number",
    "Student",
    "Admission number",
    "Grade",
    "Class",
    "Term",
    "Academic year",
    "Invoice date",
    "Due date",
    "Amount",
    "Status",
  ];
  const rows = invoices.map((invoice) => [
    invoice.invoiceNumber,
    `${invoice.studentFirstName} ${invoice.studentLastName}`,
    invoice.admissionNumber,
    invoice.gradeName,
    invoice.className,
    invoice.termName,
    invoice.academicYearName,
    invoice.invoiceDate,
    invoice.dueDate,
    invoice.amount,
    invoice.status === "pending" && invoice.dueDate < new Date().toISOString().slice(0, 10)
      ? "overdue"
      : invoice.status,
  ]);
  const csv = [header, ...rows].map((row) => row.map(cell).join(",")).join("\r\n");

  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="invoices.csv"',
      "Cache-Control": "no-store",
    },
  });
}
