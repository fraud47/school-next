import { relations, sql } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "parent",
  "teacher",
  "accountant",
  "admin",
]);

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "pending",
  "paid",
  "cancelled",
]);

export const feeTemplateStatusEnum = pgEnum("fee_template_status", ["active", "draft"]);
export const paymentMethodEnum = pgEnum("payment_method", ["cash", "bank_transfer", "ecocash", "card", "other"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  role: userRoleEnum("role").default("parent").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const schoolSettings = pgTable("school_settings", {
  id: integer("id").primaryKey().default(1),
  name: text("name").notNull().default("Your School"),
  address: text("address").notNull().default(""),
  email: text("email").notNull().default(""),
  logoData: text("logo_data"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const parents = pgTable("parents", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, {
    onDelete: "set null",
  }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [unique("parents_user_id_unique").on(table.userId)]);

export const academicYears = pgTable("academic_years", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  startDate: date("start_date", { mode: "string" }).notNull(),
  endDate: date("end_date", { mode: "string" }).notNull(),
  isCurrent: boolean("is_current").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const terms = pgTable("terms", {
  id: serial("id").primaryKey(),
  academicYearId: integer("academic_year_id")
    .notNull()
    .references(() => academicYears.id, { onDelete: "restrict" }),
  name: text("name").notNull(),
  startDate: date("start_date", { mode: "string" }).notNull(),
  endDate: date("end_date", { mode: "string" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [unique("terms_academic_year_name_unique").on(table.academicYearId, table.name)]);

export const gradeLevels = pgTable("grade_levels", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const classes = pgTable("classes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  gradeLevelId: integer("grade_level_id")
    .notNull()
    .references(() => gradeLevels.id, { onDelete: "restrict" }),
  academicYearId: integer("academic_year_id")
    .notNull()
    .references(() => academicYears.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [unique("classes_name_year_unique").on(table.name, table.academicYearId)]);

export const students = pgTable("students", {
  id: serial("id").primaryKey(),
  admissionNumber: text("admission_number").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  dateOfBirth: date("date_of_birth", { mode: "string" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const studentParents = pgTable("student_parents", {
  studentId: integer("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  parentId: integer("parent_id")
    .notNull()
    .references(() => parents.id, { onDelete: "cascade" }),
}, (table) => [primaryKey({ columns: [table.studentId, table.parentId] })]);

export const studentClassEnrollments = pgTable("student_class_enrollments", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "cascade" }),
  classId: integer("class_id")
    .notNull()
    .references(() => classes.id, { onDelete: "restrict" }),
  termId: integer("term_id").references(() => terms.id, { onDelete: "restrict" }),
  enrolledAt: date("enrolled_at", { mode: "string" }).defaultNow().notNull(),
}, (table) => [unique("student_class_enrollments_student_term_unique").on(table.studentId, table.termId)]);

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  invoiceNumber: text("invoice_number").notNull().unique(),
  studentId: integer("student_id")
    .notNull()
    .references(() => students.id, { onDelete: "restrict" }),
  termId: integer("term_id")
    .notNull()
    .references(() => terms.id, { onDelete: "restrict" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  dueDate: date("due_date", { mode: "string" }).notNull(),
  notes: text("notes"),
  status: invoiceStatusEnum("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id, { onDelete: "restrict" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  method: paymentMethodEnum("method").notNull(),
  reference: text("reference").notNull().unique(),
  receivedAt: timestamp("received_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  expenseDate: date("expense_date", { mode: "string" }).notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  vendor: text("vendor"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  method: paymentMethodEnum("method").notNull(),
  reference: text("reference"),
  createdBy: integer("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const feeCatalogItems = pgTable("fee_catalog_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  defaultAmount: numeric("default_amount", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("fee_catalog_items_name_lower_unique").on(sql`lower(${table.name})`),
]);

export const feeTemplates = pgTable("fee_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  academicYearId: integer("academic_year_id").references(() => academicYears.id, { onDelete: "set null" }),
  classId: integer("class_id").references(() => classes.id, { onDelete: "set null" }),
  status: feeTemplateStatusEnum("status").default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const feeTemplateItems = pgTable("fee_template_items", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull().references(() => feeTemplates.id, { onDelete: "cascade" }),
  feeCatalogItemId: integer("fee_catalog_item_id").notNull().references(() => feeCatalogItems.id, { onDelete: "restrict" }),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
}, (table) => [unique("fee_template_items_template_fee_unique").on(table.templateId, table.feeCatalogItemId)]);

export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
});

export const usersRelations = relations(users, ({ one }) => ({
  parent: one(parents),
}));

export const parentsRelations = relations(parents, ({ one, many }) => ({
  user: one(users, {
    fields: [parents.userId],
    references: [users.id],
  }),
  studentParents: many(studentParents),
}));

export const academicYearsRelations = relations(academicYears, ({ many }) => ({
  terms: many(terms),
  classes: many(classes),
}));

export const termsRelations = relations(terms, ({ one, many }) => ({
  academicYear: one(academicYears, {
    fields: [terms.academicYearId],
    references: [academicYears.id],
  }),
  studentClassEnrollments: many(studentClassEnrollments),
  invoices: many(invoices),
}));

export const gradeLevelsRelations = relations(gradeLevels, ({ many }) => ({
  classes: many(classes),
}));

export const classesRelations = relations(classes, ({ one, many }) => ({
  gradeLevel: one(gradeLevels, {
    fields: [classes.gradeLevelId],
    references: [gradeLevels.id],
  }),
  academicYear: one(academicYears, {
    fields: [classes.academicYearId],
    references: [academicYears.id],
  }),
  studentEnrollments: many(studentClassEnrollments),
}));

export const studentsRelations = relations(students, ({ many }) => ({
  studentParents: many(studentParents),
  classEnrollments: many(studentClassEnrollments),
  invoices: many(invoices),
}));

export const studentParentsRelations = relations(studentParents, ({ one }) => ({
  student: one(students, {
    fields: [studentParents.studentId],
    references: [students.id],
  }),
  parent: one(parents, {
    fields: [studentParents.parentId],
    references: [parents.id],
  }),
}));

export const studentClassEnrollmentsRelations = relations(
  studentClassEnrollments,
  ({ one }) => ({
    student: one(students, {
      fields: [studentClassEnrollments.studentId],
      references: [students.id],
    }),
    class: one(classes, {
      fields: [studentClassEnrollments.classId],
      references: [classes.id],
    }),
    term: one(terms, {
      fields: [studentClassEnrollments.termId],
      references: [terms.id],
    }),
  }),
);

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  student: one(students, {
    fields: [invoices.studentId],
    references: [students.id],
  }),
  term: one(terms, {
    fields: [invoices.termId],
    references: [terms.id],
  }),
  items: many(invoiceItems),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Parent = typeof parents.$inferSelect;
export type NewParent = typeof parents.$inferInsert;
export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
export type Class = typeof classes.$inferSelect;
export type NewClass = typeof classes.$inferInsert;
export type AcademicYear = typeof academicYears.$inferSelect;
export type NewAcademicYear = typeof academicYears.$inferInsert;
export type Term = typeof terms.$inferSelect;
export type NewTerm = typeof terms.$inferInsert;
export type GradeLevel = typeof gradeLevels.$inferSelect;
export type NewGradeLevel = typeof gradeLevels.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
export type FeeCatalogItem = typeof feeCatalogItems.$inferSelect;
export type NewFeeCatalogItem = typeof feeCatalogItems.$inferInsert;
export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type NewInvoiceItem = typeof invoiceItems.$inferInsert;
