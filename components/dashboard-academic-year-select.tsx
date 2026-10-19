"use client";

import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";
import type { DashboardData } from "@/lib/dashboard-data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function DashboardAcademicYearSelect({
  academicYears,
  selectedId,
}: {
  academicYears: DashboardData["academicYears"];
  selectedId: number | null;
}) {
  const router = useRouter();

  return (
    <div className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-[10px] text-slate-600 shadow-sm hover:bg-slate-50">
      <CalendarDays aria-hidden="true" className="size-3.5 text-indigo-600" />
      <div className="text-left">
        <span className="hidden text-[9px] text-slate-400 sm:block">Academic Year</span>
        <Select
          value={selectedId === null ? "" : String(selectedId)}
          onValueChange={(value) => {
            if (value) router.push(`/admin?academicYearId=${encodeURIComponent(value)}`);
          }}
        >
          <SelectTrigger aria-label="Academic year" className="h-4 min-w-0 gap-1 border-0 bg-transparent p-0 text-[10px] font-semibold text-slate-700 shadow-none hover:bg-transparent focus-visible:ring-0">
            <SelectValue placeholder="No academic year set" />
          </SelectTrigger>
          <SelectContent align="end">
            {academicYears.map((year) => (
              <SelectItem key={year.id} value={String(year.id)}>{year.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
