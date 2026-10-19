import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { DashboardOverview } from "@/components/dashboard-overview";
import { authOptions } from "@/lib/auth";
import { ROLE_HOME, USER_ROLES, type UserRole } from "@/lib/roles";
import { getDashboardData } from "@/lib/dashboard-data";

const ROLE_LABELS: Record<UserRole, string> = {
  parent: "Parent",
  teacher: "Teacher",
  accountant: "Accountant",
  admin: "Administrator",
};

export default async function RoleDashboard({
  params,
  searchParams,
}: {
  params: Promise<{ role: string }>;
  searchParams: Promise<{ academicYearId?: string }>;
}) {
  const { role: requestedRole } = await params;
  if (!USER_ROLES.includes(requestedRole as UserRole)) {
    notFound();
  }

  const role = requestedRole as UserRole;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect(`/sign-in?callbackUrl=${ROLE_HOME[role]}`);
  }
  if (session.user.role !== role) {
    redirect("/unauthorized");
  }

  if (role === "admin") {
    const query = await searchParams;
    const parsedYearId = Number(query.academicYearId);
    const selectedYearId = Number.isInteger(parsedYearId) && parsedYearId > 0 ? parsedYearId : undefined;
    const dashboardData = await getDashboardData(selectedYearId);
    return (
      <DashboardOverview
        isAdmin
        userName={session.user.name ?? session.user.email ?? "Administrator"}
        data={dashboardData}
      />
    );
  }

  return (
    <main style={{ maxWidth: 720, margin: "4rem auto", padding: "0 1.5rem", fontFamily: "system-ui, sans-serif" }}>
      <p style={{ color: "#64748b" }}>School management system</p>
      <h1>{ROLE_LABELS[role]} dashboard</h1>
      <p>Signed in as {session.user.name || session.user.email}.</p>
      <p>Your account has the {ROLE_LABELS[role].toLowerCase()} role.</p>
    </main>
  );
}
