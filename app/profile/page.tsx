import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ArrowLeft, Mail, ShieldCheck, UserRound } from "lucide-react";
import { AccountDropdown } from "@/components/account-dropdown";
import { authOptions } from "@/lib/auth";
import { ROLE_HOME, type UserRole } from "@/lib/roles";
import { getSchoolSettings } from "@/lib/school-settings";

const roleNames: Record<UserRole, string> = {
  admin: "Administrator",
  accountant: "Accountant",
  teacher: "Teacher",
  parent: "Parent",
};

export default async function ProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/sign-in?callbackUrl=%2Fprofile");

  const school = await getSchoolSettings();
  const name = session.user.name || session.user.email || "User";
  const role = session.user.role;

  return (
    <main className="min-h-screen bg-[#f7f9fc] text-slate-800">
      <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-8">
        <Link className="flex min-w-0 items-center gap-2.5" href={ROLE_HOME[role]}>
          {school.logoData ? <img alt="" className="size-8 rounded-md object-contain" src={school.logoData} /> : <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 text-white"><UserRound className="size-4" /></span>}
          <span className="truncate text-sm font-semibold text-slate-900">{school.name}</span>
        </Link>
        <AccountDropdown name={name} subtitle={roleNames[role]} />
      </header>

      <div className="mx-auto max-w-3xl p-4 sm:p-8">
        <Link className="mb-5 inline-flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-indigo-700" href={ROLE_HOME[role]}><ArrowLeft className="size-3.5" />Back to dashboard</Link>
        <div className="mb-5"><p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-600">Account</p><h1 className="text-2xl font-bold tracking-tight text-slate-900">My profile</h1><p className="mt-1 text-sm text-slate-500">Your account details and school access.</p></div>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-4 border-b border-slate-100 p-5 sm:p-6">
            <span className="flex size-14 items-center justify-center rounded-2xl bg-indigo-50 text-lg font-semibold text-indigo-700">{name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("")}</span>
            <div className="min-w-0"><h2 className="truncate text-lg font-semibold text-slate-900">{name}</h2><p className="mt-1 text-xs text-slate-500">{roleNames[role]}</p></div>
          </div>
          <dl className="divide-y divide-slate-100">
            <div className="flex items-start gap-3 p-5 sm:px-6"><Mail className="mt-0.5 size-4 text-slate-400" /><div><dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Email address</dt><dd className="mt-1 break-all text-sm font-medium text-slate-800">{session.user.email || "Not provided"}</dd></div></div>
            <div className="flex items-start gap-3 p-5 sm:px-6"><ShieldCheck className="mt-0.5 size-4 text-slate-400" /><div><dt className="text-[10px] font-medium uppercase tracking-wide text-slate-400">School role</dt><dd className="mt-1 text-sm font-medium text-slate-800">{roleNames[role]}</dd></div></div>
          </dl>
        </section>
      </div>
    </main>
  );
}
