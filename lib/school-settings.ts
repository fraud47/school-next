import { eq } from "drizzle-orm";
import { db } from "@/db";
import { schoolSettings } from "@/db/schema";

export async function getSchoolSettings() {
  const [settings] = await db.select().from(schoolSettings).where(eq(schoolSettings.id, 1)).limit(1);
  return settings ?? {
    id: 1,
    name: "Your School",
    address: "",
    email: "",
    logoData: null,
    updatedAt: new Date(0),
  };
}
