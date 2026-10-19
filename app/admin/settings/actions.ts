"use server";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { academicYears, classes, feeCatalogItems, feeTemplateItems, feeTemplates, schoolSettings } from "@/db/schema";
import { requireAdminSession } from "@/lib/admin";
import { getSchoolSettings } from "@/lib/school-settings";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function optionalId(value: string) {
  if (!value) return null;
  if (!/^\d+$/.test(value)) return undefined;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : undefined;
}

export async function saveSchoolIdentity(formData: FormData) {
  await requireAdminSession();
  const name = text(formData, "schoolName");
  const address = text(formData, "schoolAddress");
  const email = text(formData, "schoolEmail").toLowerCase();
  if (!name || name.length > 120 || address.length > 300 || email.length > 254 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    redirect("/admin/settings?tab=general&error=invalid-school-details#general");
  }

  const upload = formData.get("schoolLogo");
  let logoData: string | null = null;
  if (upload instanceof File && upload.size > 0) {
    if (upload.size > 2 * 1024 * 1024) redirect("/admin/settings?tab=general&error=school-logo-too-large#general");
    const bytes = Buffer.from(await upload.arrayBuffer());
    const isPng = upload.type === "image/png" && bytes.subarray(0, 8).toString("hex") === "89504e470d0a1a0a";
    const isJpeg = upload.type === "image/jpeg" && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const isWebp = upload.type === "image/webp" && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
    if (!isPng && !isJpeg && !isWebp) redirect("/admin/settings?tab=general&error=invalid-school-logo#general");
    logoData = `data:${upload.type};base64,${bytes.toString("base64")}`;
  } else if (text(formData, "removeSchoolLogo") !== "1") {
    logoData = (await getSchoolSettings()).logoData;
  }

  await db.insert(schoolSettings).values({ id: 1, name, address, email, logoData, updatedAt: new Date() })
    .onConflictDoUpdate({ target: schoolSettings.id, set: { name, address, email, logoData, updatedAt: new Date() } });
  for (const path of ["/admin", "/admin/settings", "/admin/invoices", "/admin/payments", "/admin/reports"]) revalidatePath(path);
  redirect("/admin/settings?tab=general&notice=school-details-saved#general");
}

export async function createFeeTemplate(formData: FormData) {
  await requireAdminSession();
  const name = text(formData, "name");
  const academicYearId = optionalId(text(formData, "academicYearId"));
  const classId = optionalId(text(formData, "classId"));
  const rawIds = formData.getAll("feeCatalogItemId");
  const feeIds = rawIds.map((value) => typeof value === "string" && /^\d+$/.test(value) ? Number(value) : NaN);
  if (!name || name.length > 100 || academicYearId === undefined || classId === undefined || feeIds.length === 0 || feeIds.length > 100 || feeIds.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
    redirect("/admin/settings?tab=fees&error=invalid-template#fees");
  }

  const validYear = academicYearId
    ? await db.select({ id: academicYears.id }).from(academicYears).where(eq(academicYears.id, academicYearId)).limit(1)
    : [];
  const validClass = classId
    ? await db.select({ id: classes.id, academicYearId: classes.academicYearId }).from(classes).where(eq(classes.id, classId)).limit(1)
    : [];
  const catalogItems = await db.select({ id: feeCatalogItems.id }).from(feeCatalogItems).where(inArray(feeCatalogItems.id, feeIds));
  if ((academicYearId && !validYear[0]) || (classId && !validClass[0]) || (academicYearId && classId && validClass[0]?.academicYearId !== academicYearId) || catalogItems.length !== new Set(feeIds).size || new Set(feeIds).size !== feeIds.length) {
    redirect("/admin/settings?tab=fees&error=invalid-template-items#fees");
  }

  const amounts = feeIds.map((id) => {
    const rawAmount = text(formData, `feeAmount_${id}`);
    if (!/^\d{1,10}(\.\d{1,2})?$/.test(rawAmount)) return null;
    const value = Number(rawAmount);
    return Number.isFinite(value) && value > 0 ? value.toFixed(2) : null;
  });
  if (amounts.some((amount) => amount === null)) redirect("/admin/settings?tab=fees&error=invalid-template-amount#fees");

  await db.transaction(async (tx) => {
    const [template] = await tx.insert(feeTemplates).values({
      name,
      academicYearId,
      classId,
      status: "active",
    }).returning({ id: feeTemplates.id });
    await tx.insert(feeTemplateItems).values(feeIds.map((feeCatalogItemId, index) => ({
      templateId: template.id,
      feeCatalogItemId,
      amount: amounts[index]!,
    })));
  });
  revalidatePath("/admin/settings");
  revalidatePath("/admin/invoices/new");
  redirect("/admin/settings?tab=fees&notice=template-created#fees");
}
