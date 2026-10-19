import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { academicYears, classes, gradeLevels, terms } from "@/db/schema";

export async function getStudentFormOptions() {
  const [classOptions, termOptions, gradeOptions, academicYearOptions] = await Promise.all([
    db
      .select({
        id: classes.id,
        name: classes.name,
        gradeName: gradeLevels.name,
        academicYearName: academicYears.name,
        academicYearId: classes.academicYearId,
      })
      .from(classes)
      .innerJoin(gradeLevels, eq(classes.gradeLevelId, gradeLevels.id))
      .innerJoin(academicYears, eq(classes.academicYearId, academicYears.id))
      .orderBy(asc(academicYears.name), asc(gradeLevels.name), asc(classes.name)),
    db
      .select({
        id: terms.id,
        name: terms.name,
        academicYearName: academicYears.name,
        academicYearId: terms.academicYearId,
      })
      .from(terms)
      .innerJoin(academicYears, eq(terms.academicYearId, academicYears.id))
      .orderBy(desc(academicYears.startDate), desc(terms.startDate)),
    db.select({ id: gradeLevels.id, name: gradeLevels.name })
      .from(gradeLevels)
      .orderBy(asc(gradeLevels.name)),
    db.select({ id: academicYears.id, name: academicYears.name })
      .from(academicYears)
      .orderBy(desc(academicYears.startDate)),
  ]);

  return { classOptions, termOptions, gradeOptions, academicYearOptions };
}

export function formatStudentDate(value: string | null) {
  if (!value) return "Not provided";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}
