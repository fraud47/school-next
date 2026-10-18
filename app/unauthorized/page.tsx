import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="mx-auto max-w-xl p-6">
      <div className="rounded-2xl bg-white p-8 text-center shadow">
        <h1 className="mb-3 text-2xl font-semibold">Access denied</h1>
        <p className="mb-6 text-sm text-slate-600">Your account does not have permission to view that page.</p>
        <div className="flex justify-center gap-3">
          <Link href="/dashboard" className="rounded-lg border px-4 py-2">Back to Dashboard</Link>
          <Link href="/sign-in" className="rounded-lg bg-indigo-950 px-4 py-2 text-white">Sign in</Link>
        </div>
      </div>
    </main>
  );
}
