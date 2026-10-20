"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ToastContainer, toast } from "react-toastify";

const notices: Record<string, string> = {
  "school-details-saved": "School details saved.",
  "template-created": "Fee template created.",
  "expense-recorded": "Expense recorded.",
  "product-created": "Product created.",
  "product-sale-recorded": "Product sale recorded.",
  "product-restocked": "Product stock updated.",
  "activity-payment-recorded": "Student activity payment recorded.",
  "class-created": "Class created.",
  "class-updated": "Class updated.",
  "class-deleted": "Class deleted.",
  created: "Student created.",
  updated: "Changes saved.",
  assigned: "Student placement saved.",
  deleted: "Record deleted.",
};

const errors: Record<string, string> = {
  "activity-payment-save-failed": "Could not save the student activity payment. Check the database and try again.",
  "invalid-activity-payment": "Check the student, activity, method, and amount, then try again.",
  "invalid-payment-date": "Enter a valid payment date.",
  "invalid-class": "Enter a valid class name, grade, and academic year.",
  "duplicate-class": "A class with that name already exists for the selected academic year.",
  "class-save-failed": "Could not save the class. Please try again.",
  "class-not-found": "That class could not be found.",
  "class-has-students": "This class has enrolled students. Move them before changing its grade/year or deleting it.",
  "class-cannot-delete": "This class is referenced by another record and cannot be deleted.",
};

function readable(code: string, kind: "notice" | "error") {
  const known = notices[code];
  if (known) return known;
  if (kind === "error" && errors[code]) return errors[code];
  return code.replace(/[-_]/g, " ").replace(/^./, (letter) => letter.toUpperCase()) ||
    (kind === "error" ? "Something went wrong." : "Changes saved.");
}

function resolveActionToast(message: string, type: "success" | "error", autoClose: number) {
  const options = { render: message, type, isLoading: false, autoClose };
  if (toast.isActive("system-form-action")) {
    toast.update("system-form-action", options);
  } else if (type === "success") {
    toast.success(message, { toastId: "system-form-action", autoClose });
  } else {
    toast.error(message, { toastId: "system-form-action", autoClose });
  }
}

export function SystemFeedback() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const previousLocation = useRef(`${pathname}?${query}`);
  const loading = useRef(false);
  const loadingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleSubmit = (event: SubmitEvent) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      // A field named "method" masks HTMLFormElement.method in the DOM.
      if (!form.hasAttribute("action") || form.getAttribute("method")?.toLowerCase() === "get") return;
      loading.current = true;
      toast.loading("Saving…", { toastId: "system-form-action", autoClose: false });
      if (loadingTimer.current) clearTimeout(loadingTimer.current);
      loadingTimer.current = setTimeout(() => {
        if (!loading.current) return;
        loading.current = false;
        resolveActionToast("The request did not finish. Refresh to check whether it was saved.", "error", 7000);
      }, 20000);
    };
    document.addEventListener("submit", handleSubmit, true);
    return () => {
      document.removeEventListener("submit", handleSubmit, true);
      if (loadingTimer.current) clearTimeout(loadingTimer.current);
    };
  }, []);

  useEffect(() => {
    const location = `${pathname}?${query}`;
    const changed = location !== previousLocation.current;
    previousLocation.current = location;
    const params = new URLSearchParams(query);
    const error = params.get("error");
    const created = params.get("created");
    const notice = params.get("notice") ?? (created && /^\d+$/.test(created) ? `Created ${created} invoices successfully.` : created);
    if (error) {
      loading.current = false;
      if (loadingTimer.current) clearTimeout(loadingTimer.current);
      resolveActionToast(readable(error, "error"), "error", 5000);
      params.delete("error");
      params.delete("notice");
      params.delete("created");
      router.replace(`${pathname}${params.size ? `?${params.toString()}` : ""}${window.location.hash}`);
    } else if (notice) {
      loading.current = false;
      if (loadingTimer.current) clearTimeout(loadingTimer.current);
      resolveActionToast(readable(notice, "notice"), "success", 3500);
      params.delete("error");
      params.delete("notice");
      params.delete("created");
      router.replace(`${pathname}${params.size ? `?${params.toString()}` : ""}${window.location.hash}`);
    } else if (changed && loading.current) {
      loading.current = false;
      if (loadingTimer.current) clearTimeout(loadingTimer.current);
      resolveActionToast("Completed successfully.", "success", 3000);
    }
  }, [pathname, query, router]);

  return <ToastContainer position="top-right" newestOnTop closeOnClick pauseOnFocusLoss theme="light" />;
}
