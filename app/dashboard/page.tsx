import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { DashboardOverview } from "@/components/dashboard-overview";
import { authOptions } from "@/lib/auth";
import { ROLE_HOME } from "@/lib/roles";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    redirect(ROLE_HOME[session.user.role]);
  }

  return <DashboardOverview />;
}
