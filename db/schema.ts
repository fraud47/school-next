import { pgEnum, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", [
  "parent",
  "teacher",
  "accountant",
  "admin",
]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name"),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  role: userRoleEnum("role").default("parent").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});



export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
