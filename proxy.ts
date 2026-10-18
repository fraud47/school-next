import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { USER_ROLES } from "@/lib/roles";

export default withAuth(
  function middleware(req) {
    const requiredRole = USER_ROLES.find(
      (role) => req.nextUrl.pathname === `/${role}` || req.nextUrl.pathname.startsWith(`/${role}/`)
    );

    if (requiredRole && req.nextauth.token?.role !== requiredRole) {
      return NextResponse.redirect(new URL("/unauthorized", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/sign-in",
    },
    secret: process.env.NEXTAUTH_SECRET,
  }
);

export const config = {
  matcher: [
    "/protected/:path*",
    "/dashboard/:path*",
    "/admin/:path*",
    "/teacher/:path*",
    "/accountant/:path*",
    "/parent/:path*",
    "/profile/:path*",
    "/settings/:path*",
  ],
};
