import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/roles";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    // Signed in -> send to role home
    redirect(ROLE_HOME[session.user.role]);
  }

  // Public dashboard when not signed in
  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="rounded-2xl bg-white p-8 shadow">
        <h1 className="mb-2 text-3xl font-semibold">Welcome to SchoolSpace</h1>
        <p className="mb-6 text-sm text-slate-600">A simple school management dashboard for parents, teachers and staff.</p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border p-4">
            <h3 className="text-lg font-medium">For Parents</h3>
            <p className="mt-2 text-sm text-slate-600">View your child&apos;s progress, attendance and messages from teachers.</p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="text-lg font-medium">For Teachers</h3>
            <p className="mt-2 text-sm text-slate-600">Manage classes, assignments and communicate with parents.</p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="text-lg font-medium">For Accountants</h3>
            <p className="mt-2 text-sm text-slate-600">Manage billing, invoices and school finances.</p>
          </div>
          <div className="rounded-lg border p-4">
            <h3 className="text-lg font-medium">For Admins</h3>
            <p className="mt-2 text-sm text-slate-600">Centralised control for school settings and users.</p>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <Link href="/sign-in" className="inline-flex items-center gap-2 rounded-lg bg-indigo-950 px-4 py-2 text-white">Sign in</Link>
          <Link href="/sign-up" className="inline-flex items-center gap-2 rounded-lg border px-4 py-2">Create account</Link>
        </div>
      </div>
    </main>
  );
}
