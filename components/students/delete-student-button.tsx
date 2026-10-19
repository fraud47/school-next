"use client";

import type { FormEvent } from "react";
import { deleteStudent } from "@/app/admin/students/actions";

export function DeleteStudentButton({ studentId }: { studentId: number }) {
  function confirmDelete(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm("Delete this student? This will also remove their class enrollment history.")) {
      event.preventDefault();
    }
  }

  return (
    <form action={deleteStudent} onSubmit={confirmDelete}>
      <input name="studentId" type="hidden" value={studentId} />
      <button className="inline-flex h-9 items-center justify-center rounded-lg border border-rose-200 px-3 text-sm font-medium text-rose-700 transition-colors hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300" type="submit">
        Delete student
      </button>
    </form>
  );
}
