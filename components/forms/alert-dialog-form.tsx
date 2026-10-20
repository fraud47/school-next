"use client";

import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function AlertDialogForm({
  title,
  description,
  triggerLabel,
  children,
  triggerClassName,
}: {
  title: string;
  description: string;
  triggerLabel: string;
  children: ReactNode;
  triggerClassName?: string;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger className={triggerClassName ?? "inline-flex h-9 items-center gap-2 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700"}>
        <Plus className="size-4" />{triggerLabel}
      </AlertDialogTrigger>
      <AlertDialogContent className="max-h-[90vh] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {children}
      </AlertDialogContent>
    </AlertDialog>
  );
}
