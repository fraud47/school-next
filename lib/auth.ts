import { eq } from "drizzle-orm";
import type { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GithubProvider from "next-auth/providers/github";
import GoogleProvider from "next-auth/providers/google";
import { db } from "@/db";
import { users } from "@/db/schema";
import type { UserRole } from "@/lib/roles";
import { hashPassword, verifyPassword } from "@/lib/password";

const DEFAULT_ADMIN_EMAIL = "admin@school.local";

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email or username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const identifier = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password;
        if (!identifier || !password) {
          return null;
        }

        const isAdminLogin = identifier === "admin@school.local";
        const email = isAdminLogin ? DEFAULT_ADMIN_EMAIL : identifier;

        if (isAdminLogin) {
          await db
            .insert(users)
            .values({
              name: "School Administrator",
              email: DEFAULT_ADMIN_EMAIL,
              passwordHash: hashPassword("619619"),
              role: "admin",
            })
            .onConflictDoNothing({ target: users.email });
        }

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (
          !user?.passwordHash ||
          (isAdminLogin && user.role !== "admin") ||
          !verifyPassword(password, user.passwordHash)
        ) {
          return null;
        }

        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID || "placeholder-id",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "placeholder-secret",
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "placeholder-id",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "placeholder-secret",
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.type !== "oauth") {
        return true;
      }
      if (!user.email) {
        return false;
      }

      const email = user.email.trim().toLowerCase();
      await db
        .insert(users)
        .values({ name: user.name, email, role: "parent" })
        .onConflictDoNothing({ target: users.email });

      const [record] = await db
        .select({ id: users.id, role: users.role, passwordHash: users.passwordHash })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      if (!record || record.passwordHash) {
        return false;
      }

      user.id = String(record.id);
      user.role = record.role;
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role as UserRole;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role as UserRole;
      }
      return session;
    },
  },
  pages: {
    signIn: "/sign-in",
    newUser: "/sign-up",
  },
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
};
