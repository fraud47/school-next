"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAdminSession } from "@/lib/admin";
import { hashPassword } from "@/lib/password";
import { USER_ROLES, type UserRole } from "@/lib/roles";

function value(data: FormData, key: string) {
  const result = data.get(key);
  return typeof result === "string" ? result.trim() : "";
}

function validRole(role: string): role is UserRole {
  return USER_ROLES.includes(role as UserRole);
}

function fail(code: string): never {
  redirect(`/admin/settings?tab=users&error=${code}#users`);
}

function done(code: string): never {
  revalidatePath("/admin/settings");
  redirect(`/admin/settings?tab=users&notice=${code}#users`);
}

export async function createManagedUser(data: FormData) {
  await requireAdminSession();
  const name = value(data, "name");
  const email = value(data, "email").toLowerCase();
  const password = value(data, "password");
  const role = value(data, "role");
  if (!name || name.length > 120 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 8 || password.length > 128 || !validRole(role)) fail("invalid-user");

  try {
    await db.insert(users).values({ name, email, passwordHash: hashPassword(password), role });
  } catch {
    fail("duplicate-user-email");
  }
  done("user-created");
}

export async function updateManagedUser(data: FormData) {
  const session = await requireAdminSession();
  const idText = value(data, "id");
  const id = /^\d+$/.test(idText) ? Number(idText) : NaN;
  const name = value(data, "name");
  const email = value(data, "email").toLowerCase();
  const password = value(data, "password");
  const role = value(data, "role");
  if (!Number.isSafeInteger(id) || id < 1 || !name || name.length > 120 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || (password && (password.length < 8 || password.length > 128)) || !validRole(role)) fail("invalid-user");

  const targetId = Number(id);
  if (String(targetId) === session.user.id && role !== "admin") fail("cannot-change-own-role");
  try {
    await db.update(users).set({ name, email, role, ...(password ? { passwordHash: hashPassword(password) } : {}) }).where(eq(users.id, targetId));
  } catch {
    fail("duplicate-user-email");
  }
  done("user-updated");
}

export async function deleteManagedUser(data: FormData) {
  const session = await requireAdminSession();
  const idText = value(data, "id");
  const id = /^\d+$/.test(idText) ? Number(idText) : NaN;
  if (!Number.isSafeInteger(id) || id < 1) fail("invalid-user");
  if (String(id) === session.user.id) fail("cannot-delete-self");

  const [target] = await db.select({ role: users.role }).from(users).where(eq(users.id, id)).limit(1);
  if (!target) fail("user-not-found");
  if (target.role === "admin") {
    const remainingAdmins = await db.select({ id: users.id }).from(users).where(and(eq(users.role, "admin"), ne(users.id, id))).limit(1);
    if (!remainingAdmins.length) fail("last-admin");
  }
  await db.delete(users).where(eq(users.id, id));
  done("user-deleted");
}
