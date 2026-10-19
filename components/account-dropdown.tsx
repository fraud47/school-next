"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ChevronDown, CircleUserRound, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AccountDropdown({ name, subtitle = "Account" }: { name: string; subtitle?: string }) {
  const router = useRouter();
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-lg p-1 text-left outline-none transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-400">
        <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-semibold text-indigo-700">{initials}</span>
        <span className="hidden min-w-0 sm:block">
          <span className="block max-w-40 truncate text-xs font-semibold text-slate-800">{name}</span>
          <span className="block text-[10px] text-slate-500">{subtitle}</span>
        </span>
        <ChevronDown className="size-3 text-slate-400" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <span className="block truncate text-sm font-medium text-slate-900">{name}</span>
            <span className="text-xs text-slate-500">{subtitle}</span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/profile")}>
          <CircleUserRound />
          Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-rose-600 focus:text-rose-700" onClick={() => signOut({ callbackUrl: "/sign-in" })}>
          <LogOut />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
