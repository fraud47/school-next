import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main style={{ maxWidth: 560, margin: "6rem auto", padding: "0 1.5rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>Access denied</h1>
      <p>Your account does not have permission to view that page.</p>
      <Link href="/dashboard">Go to your dashboard</Link>
    </main>
  );
}
