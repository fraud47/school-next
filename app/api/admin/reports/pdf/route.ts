import { getInvoiceList } from "@/lib/invoice-data";
import { requireAdminSession } from "@/lib/admin";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { expenses, invoiceItems, invoices, payments, students } from "@/db/schema";
import { getSchoolSettings } from "@/lib/school-settings";

type ReportId = "cashbook" | "aging" | "invoices" | "statement" | "financial";

function pdfText(value: string) {
  return value.normalize("NFKD").replace(/[^\x20-\x7E]/g, "?").replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function makePdf(lines: string[]) {
  const wrapped = lines.flatMap((line) => {
    const output: string[] = [];
    let remaining = line;
    while (remaining.length > 105) {
      const splitAt = remaining.lastIndexOf(" ", 105);
      const point = splitAt > 0 ? splitAt : 105;
      output.push(remaining.slice(0, point));
      remaining = remaining.slice(point).trimStart();
    }
    output.push(remaining);
    return output;
  });
  const pages: string[][] = [];
  for (let index = 0; index < wrapped.length; index += 48) pages.push(wrapped.slice(index, index + 48));
  if (!pages.length) pages.push(["No records found."]);
  const objects: string[] = [];
  const add = (value: string) => { objects.push(value); return objects.length; };
  const catalogId = add("");
  const pagesId = add("");
  const fontId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  const pageIds: number[] = [];
  for (const pageLines of pages) {
    const commands = ["BT", "/F1 10 Tf", "48 790 Td", "14 TL"];
    pageLines.forEach((line, index) => commands.push(`${index ? "T* " : ""}(${pdfText(line)}) Tj`));
    commands.push("ET");
    const stream = commands.join("\n");
    const contentId = add(`<< /Length ${Buffer.byteLength(stream, "ascii")} >>\nstream\n${stream}\nendstream`);
    pageIds.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 842] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`));
  }
  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
  let document = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(document, "ascii"));
    document += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(document, "ascii");
  document += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index += 1) document += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  document += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(document, "ascii");
}

function amount(value: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value) || 0);
}

export async function GET(request: Request) {
  await requireAdminSession();
  const url = new URL(request.url);
  const requested = url.searchParams.get("report");
  const allowed: ReportId[] = ["cashbook", "aging", "invoices", "statement", "financial"];
  const report: ReportId = allowed.includes(requested as ReportId) ? requested as ReportId : "invoices";
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 8)}01`;
  const dateParam = (key: string, fallback: string) => {
    const value = url.searchParams.get(key) || "";
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)) ? value : fallback;
  };
  const from = dateParam("from", monthStart);
  const to = dateParam("to", today);
  const asOf = dateParam("asOf", today);
  const query = url.searchParams.get("q")?.trim().toLowerCase();
  const all = await getInvoiceList({}, { limit: 5000, offset: 0 });
  const paymentRows = await db.select({ id: payments.id, invoiceId: payments.invoiceId, reference: payments.reference, amount: payments.amount, method: payments.method, receivedAt: payments.receivedAt, invoiceNumber: invoices.invoiceNumber, studentId: students.id, firstName: students.firstName, lastName: students.lastName, admissionNumber: students.admissionNumber })
    .from(payments).innerJoin(invoices, eq(payments.invoiceId, invoices.id)).innerJoin(students, eq(invoices.studentId, students.id))
    .where(lte(payments.receivedAt, new Date(`${(report === "aging" ? asOf : to)}T23:59:59.999Z`)))
    .orderBy(asc(payments.receivedAt), asc(payments.id));
  const paidByInvoice = new Map<number, number>();
  for (const payment of paymentRows) paidByInvoice.set(payment.invoiceId, (paidByInvoice.get(payment.invoiceId) ?? 0) + Number(payment.amount));
  const paidAmount = (invoice: (typeof all)[number]) => paidByInvoice.get(invoice.id) ?? (invoice.status === "paid" ? Number(invoice.amount) : 0);
  const periodPayments = paymentRows.filter((payment) => {
    const date = payment.receivedAt.toISOString().slice(0, 10);
    return date >= from && date <= to && (!query || `${payment.firstName} ${payment.lastName} ${payment.admissionNumber} ${payment.invoiceNumber} ${payment.reference}`.toLowerCase().includes(query));
  });
  const periodExpenses = await db.select().from(expenses)
    .where(and(gte(expenses.expenseDate, from), lte(expenses.expenseDate, to)))
    .orderBy(asc(expenses.expenseDate), asc(expenses.id));
  const filteredExpenses = periodExpenses.filter((expense) => !query || `${expense.category} ${expense.description} ${expense.vendor ?? ""} ${expense.reference ?? ""}`.toLowerCase().includes(query));
  const periodPaid = new Map<number, number>();
  for (const payment of periodPayments) periodPaid.set(payment.invoiceId, (periodPaid.get(payment.invoiceId) ?? 0) + Number(payment.amount));
  const inRange = all.filter((invoice) => {
    const date = invoice.invoiceDate instanceof Date ? invoice.invoiceDate.toISOString().slice(0, 10) : String(invoice.invoiceDate).slice(0, 10);
    return date >= from && date <= to && (!query || `${invoice.studentFirstName} ${invoice.studentLastName} ${invoice.admissionNumber} ${invoice.invoiceNumber}`.toLowerCase().includes(query));
  });
  const aging = all.filter((invoice) => {
    const invoiceDate = invoice.invoiceDate instanceof Date ? invoice.invoiceDate.toISOString().slice(0, 10) : String(invoice.invoiceDate).slice(0, 10);
    return invoice.status !== "cancelled" && invoiceDate <= asOf && paidAmount(invoice) < Number(invoice.amount);
  }).map((invoice) => ({ ...invoice, amount: String(Math.max(0, Number(invoice.amount) - paidAmount(invoice))) }));
  const entries = report === "aging" ? aging : inRange;
  const title: Record<ReportId, string> = { cashbook: "Cashbook", aging: "Aging Debtors", invoices: "School Invoices", statement: "Student Statements", financial: "Profit and Loss Statement" };
  const school = await getSchoolSettings();
  const lines = [school.name, school.address, school.email, title[report], report === "aging" ? `As of ${asOf}` : `Period ${from} to ${to}`, ""].filter(Boolean);
  let total = 0;
  if (report === "financial") {
    const income = periodPayments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
    const expenseByCategory = new Map<string, number>();
    for (const expense of filteredExpenses) expenseByCategory.set(expense.category, (expenseByCategory.get(expense.category) ?? 0) + Number(expense.amount));
    const expenseTotal = filteredExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    const net = income - expenseTotal;
    lines.push("Cash basis profit and loss", "", `Fee income received: ${amount(String(income))}`, "Operating expenses by category:");
    for (const [category, value] of expenseByCategory) lines.push(`  ${category}: (${amount(String(value))})`);
    if (!expenseByCategory.size) lines.push("  No operating expenses recorded.");
    lines.push(`Total operating expenses: (${amount(String(expenseTotal))})`, `Net operating ${net >= 0 ? "surplus" : "deficit"}: ${net < 0 ? `(${amount(String(Math.abs(net)))})` : amount(String(net))}`, "", "Expense details", "Date | Category | Description | Vendor | Method | Reference | Amount");
    for (const expense of filteredExpenses) lines.push(`${expense.expenseDate} | ${expense.category} | ${expense.description} | ${expense.vendor ?? "-"} | ${expense.method} | ${expense.reference ?? "-"} | ${amount(expense.amount)}`);
    lines.push("");
    const items = await db.select({ invoiceId: invoices.id, invoiceAmount: invoices.amount, name: invoiceItems.name, amount: invoiceItems.amount, status: invoices.status })
      .from(invoiceItems).innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
      .where(and(gte(invoices.createdAt, new Date(`${from}T00:00:00.000Z`)), lte(invoices.createdAt, new Date(`${to}T23:59:59.999Z`))));
    const byItem = new Map<string, { billed: number; collected: number }>();
    for (const item of items) {
      if (item.status === "cancelled") continue;
      const row = byItem.get(item.name) ?? { billed: 0, collected: 0 };
      const itemAmount = Number(item.amount) || 0;
      const invoiceTotal = Number(item.invoiceAmount) || 0;
      const collection = Math.min(invoiceTotal, periodPaid.get(item.invoiceId) ?? (item.status === "paid" && !paidByInvoice.has(item.invoiceId) ? invoiceTotal : 0));
      row.billed += itemAmount;
      if (invoiceTotal > 0) row.collected += itemAmount * Math.min(1, collection / invoiceTotal);
      byItem.set(item.name, row);
    }
    lines.push("Fee item | Billed | Collected | Outstanding", "-".repeat(90));
    for (const [name, values] of byItem) {
      total += values.billed;
      lines.push(`${name} | ${amount(String(values.billed))} | ${amount(String(values.collected))} | ${amount(String(values.billed - values.collected))}`);
    }
    lines.push("", `Billed total: ${amount(String(total))}`);
    lines.push("Fee item collections are allocated proportionally across each invoice's items.");
  } else if (report === "statement") {
    const students = new Map<number, { name: string; admission: string; opening: number; billed: number; received: number }>();
    for (const invoice of all) {
      if (invoice.status === "cancelled") continue;
      const invoiceDate = invoice.invoiceDate instanceof Date ? invoice.invoiceDate.toISOString().slice(0, 10) : String(invoice.invoiceDate).slice(0, 10);
      if (query && !`${invoice.studentFirstName} ${invoice.studentLastName} ${invoice.admissionNumber}`.toLowerCase().includes(query)) continue;
      const row = students.get(invoice.studentId) ?? { name: `${invoice.studentFirstName} ${invoice.studentLastName}`, admission: invoice.admissionNumber, opening: 0, billed: 0, received: 0 };
      const value = Number(invoice.amount) || 0;
      if (invoiceDate < from) {
        const prior = paymentRows.filter((payment) => payment.invoiceId === invoice.id && payment.receivedAt.toISOString().slice(0, 10) < from).reduce((sum, payment) => sum + Number(payment.amount), 0);
        row.opening += Math.max(0, value - (prior || (invoice.status === "paid" && !paidByInvoice.has(invoice.id) ? value : 0)));
      } else if (invoiceDate <= to) {
        row.billed += value;
        if (invoice.status === "paid" && !paidByInvoice.has(invoice.id)) row.received += value;
      }
      students.set(invoice.studentId, row);
    }
    for (const payment of periodPayments) {
      if (query && !`${payment.firstName} ${payment.lastName} ${payment.admissionNumber}`.toLowerCase().includes(query)) continue;
      const row = students.get(payment.studentId) ?? { name: `${payment.firstName} ${payment.lastName}`, admission: payment.admissionNumber, opening: 0, billed: 0, received: 0 };
      row.received += Number(payment.amount);
      students.set(payment.studentId, row);
    }
    lines.push("Student | Admission | Opening | Billed | Received | Closing", "-".repeat(100));
    for (const student of students.values()) {
      const closing = student.opening + student.billed - student.received;
      if (!student.opening && !student.billed && !student.received && !closing) continue;
      total += closing;
      lines.push(`${student.name} | ${student.admission} | ${amount(String(student.opening))} | ${amount(String(student.billed))} | ${amount(String(student.received))} | ${amount(String(closing))}`);
    }
    lines.push("", `Closing balance total: ${amount(String(total))}`, "Received amounts reflect invoices marked paid; payment dates and partial payments are not stored.");
  } else if (report === "cashbook") {
    lines.push("Money in", "Receipt date | Reference | Student | Method | Invoice | Amount in", "-".repeat(90));
    for (const payment of periodPayments) {
      total += Number(payment.amount) || 0;
      lines.push(`${payment.receivedAt.toISOString().slice(0, 10)} | ${payment.reference} | ${payment.firstName} ${payment.lastName} | ${payment.method} | ${payment.invoiceNumber} | ${amount(payment.amount)}`);
    }
    const income = total;
    const expenseTotal = filteredExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
    lines.push("", `Money in total: ${amount(String(income))}`, "", "Money out", "Date | Category | Description | Vendor | Method | Reference | Amount out", "-".repeat(90));
    for (const expense of filteredExpenses) {
      total += Number(expense.amount) || 0;
      lines.push(`${expense.expenseDate} | ${expense.category} | ${expense.description} | ${expense.vendor ?? "-"} | ${expense.method} | ${expense.reference ?? "-"} | ${amount(expense.amount)}`);
    }
    lines.push("", `Money out total: ${amount(String(expenseTotal))}`, `Net cash movement: ${amount(String(income - expenseTotal))}`);
  } else {
    lines.push("Invoice | Student | Admission | Term | Due date | Amount | Status", "-".repeat(100));
    for (const invoice of entries) {
      const value = Number(invoice.amount) || 0;
      if (invoice.status !== "cancelled") total += value;
      lines.push(`${invoice.invoiceNumber} | ${invoice.studentFirstName} ${invoice.studentLastName} | ${invoice.admissionNumber} | ${invoice.termName} ${invoice.academicYearName} | ${invoice.dueDate} | ${amount(invoice.amount)} | ${invoice.status}`);
    }
    lines.push("", `Records: ${entries.length}`, `Billed total, excluding cancelled invoices: ${amount(String(total))}`);
      if (report === "aging") {
      lines.push("", "Aging summary (age from invoice date):");
      for (const [label, min, max] of [["0-30 days", 0, 30], ["31-60 days", 31, 60], ["61-90 days", 61, 90], ["91-120 days", 91, 120], ["Over 120 days", 121, Number.MAX_SAFE_INTEGER]] as const) {
        const bucketTotal = aging.reduce((sum, invoice) => {
          const invoiceDate = invoice.invoiceDate instanceof Date ? invoice.invoiceDate.toISOString().slice(0, 10) : String(invoice.invoiceDate).slice(0, 10);
          const days = Math.floor((Date.parse(`${asOf}T00:00:00.000Z`) - Date.parse(`${invoiceDate}T00:00:00.000Z`)) / 86_400_000);
          return days >= min && days <= max ? sum + Number(invoice.amount) : sum;
        }, 0);
        lines.push(`${label}: ${amount(String(bucketTotal))}`);
      }
    }
  }
  const pdf = makePdf(lines);
  return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${report}-report.pdf"`, "Cache-Control": "no-store" } });
}
