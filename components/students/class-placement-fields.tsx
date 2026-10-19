"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";

type ClassOption = {
  id: number;
  name: string;
  gradeName: string;
  academicYearName: string;
  academicYearId: number;
};

type TermOption = {
  id: number;
  name: string;
  academicYearName: string;
  academicYearId: number;
};

export function ClassPlacementFields({
  classes,
  terms,
  required = false,
}: {
  classes: ClassOption[];
  terms: TermOption[];
  required?: boolean;
}) {
  const [classId, setClassId] = useState("");
  const [termId, setTermId] = useState("");
  const selectedClass = classes.find((option) => String(option.id) === classId);
  const matchingTerms = terms.filter(
    (term) => term.academicYearId === selectedClass?.academicYearId,
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block text-sm font-medium text-slate-700">
        <span className="flex items-center justify-between gap-2">
          Class and grade
          <Link className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800" href="/admin/academic/setup#class">
            <Plus className="size-3.5" /> Add class
          </Link>
        </span>
        <Link className="mt-1 inline-flex items-center gap-1 text-[11px] font-normal text-indigo-600 hover:text-indigo-800" href="/admin/academic/setup#grade">
          <Plus className="size-3" /> Add grade
        </Link>
        <select
          className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          name="classId"
          onChange={(event) => {
            setClassId(event.target.value);
            setTermId("");
          }}
          required={required}
          value={classId}
        >
          <option value="">{required ? "Select class" : "Leave unassigned"}</option>
          {classes.map((classOption) => (
            <option key={classOption.id} value={classOption.id}>
              {classOption.gradeName} · {classOption.name} · {classOption.academicYearName}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-medium text-slate-700">
        <span className="flex items-center justify-between gap-2">
          Term
          <span className="flex items-center gap-3">
            <Link className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800" href="/admin/academic/setup#academic-year">
              <Plus className="size-3.5" /> Add year
            </Link>
            <Link className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800" href="/admin/academic/setup#term">
              <Plus className="size-3.5" /> Add term
            </Link>
          </span>
        </span>
        <select
          className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-400"
          disabled={!selectedClass}
          name="termId"
          onChange={(event) => setTermId(event.target.value)}
          required={required || Boolean(selectedClass)}
          value={termId}
        >
          <option value="">
            {selectedClass
              ? required
                ? "Select term"
                : "No term placement"
              : "Choose a class first"}
          </option>
          {matchingTerms.map((term) => (
            <option key={term.id} value={term.id}>
              {term.name} · {term.academicYearName}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
