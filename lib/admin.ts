import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export async function requireAdminSession() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/sign-in?callbackUrl=%2Fadmin%2Fstudents");
  }

  if (session.user.role !== "admin") {
    redirect("/unauthorized");
  }

  return session;
}
