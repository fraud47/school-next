import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/password";
import type { UserRole } from "@/lib/roles";

const STAFF_ROLES = ["teacher", "accountant"] as const;
type StaffRole = (typeof STAFF_ROLES)[number];

function isStaffRole(role: string): role is StaffRole {
  return STAFF_ROLES.includes(role as StaffRole);
}

function matchesInviteCode(provided: string, expected: string | undefined): boolean {
  if (!expected) {
    return false;
  }

  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { name, email, password, role, inviteCode } = body as Record<string, unknown>;
  if (
    typeof name !== "string" ||
    name.trim().length < 2 ||
    name.trim().length > 100 ||
    typeof email !== "string" ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
    typeof password !== "string" ||
    password.length < 6 ||
    password.length > 128 ||
    (role !== "parent" && role !== "teacher" && role !== "accountant")
  ) {
    return NextResponse.json(
      { error: "Enter a valid name, email, and role. Passwords must be 6-128 characters." },
      { status: 400 }
    );
  }

  if (isStaffRole(role)) {
    const inviteEnvKey = role === "teacher" ? "TEACHER_INVITE_CODE" : "ACCOUNTANT_INVITE_CODE";
    if (
      typeof inviteCode !== "string" ||
      !matchesInviteCode(inviteCode, process.env[inviteEnvKey])
    ) {
      return NextResponse.json(
        { error: "The staff invitation code is invalid or unavailable." },
        { status: 403 }
      );
    }
  }

  const normalizedEmail = email.trim().toLowerCase();
  try {
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);
    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const [user] = await db
      .insert(users)
      .values({
        name: name.trim(),
        email: normalizedEmail,
        passwordHash: hashPassword(password),
        role: role as UserRole,
      })
      .returning({ id: users.id, role: users.role });

    return NextResponse.json({ id: user.id, role: user.role }, { status: 201 });
  } catch (error) {
    console.error("Failed to register school account:", error);
    return NextResponse.json(
      { error: "Unable to create the account right now. Please try again." },
      { status: 500 }
    );
  }
}
