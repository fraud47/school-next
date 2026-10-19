import { NextResponse } from "next/server";
import { getSchoolSettings } from "@/lib/school-settings";

export async function GET() {
  const { name, logoData } = await getSchoolSettings();
  return NextResponse.json({ name, logoData }, { headers: { "Cache-Control": "no-store" } });
}
