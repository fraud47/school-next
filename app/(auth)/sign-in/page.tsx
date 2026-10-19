"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, BookOpen, GraduationCap, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SchoolBrand } from "@/components/school-brand";

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const urlError = searchParams.get("error");
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [credentialsLoading, setCredentialsLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    urlError === "OAuthSignin" || urlError === "OAuthCallback"
      ? "We couldn't connect to that sign-in provider. Please try again."
      : null
  );

  const handleCredentialsSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCredentialsLoading(true);
    setError(null);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        callbackUrl,
        redirect: false,
      });
      if (result?.error || !result?.url) {
        setError("The username/email or password is incorrect.");
        return;
      }
      router.push(result.url);
    } catch {
      setError("Unable to sign in right now. Please try again.");
    } finally {
      setCredentialsLoading(false);
    }
  };

  const handleOAuthSignIn = (provider: "google" | "github") => {
    setOauthLoading(provider);
    setError(null);
    void signIn(provider, { callbackUrl });
  };

  return (
    <main className="min-h-screen bg-[#f5f6fb] p-4 text-slate-950 sm:p-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-6xl items-center justify-center sm:min-h-[calc(100vh-4rem)]">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-white bg-white shadow-[0_28px_90px_-42px_rgba(36,43,87,0.32)] lg:min-h-[690px] lg:grid-cols-[1fr_0.92fr]">
          <section className="relative hidden overflow-hidden bg-[#171b3b] p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
            <div className="absolute -right-24 -top-24 size-96 rounded-full border border-white/10" />
            <div className="absolute -right-8 top-16 size-64 rounded-full border border-white/10" />
            <div className="absolute -bottom-36 -left-20 size-96 rounded-full bg-indigo-500/15 blur-3xl" />
            <Link href="/dashboard" className="relative flex w-fit items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-white text-indigo-950">
                <GraduationCap className="size-6" />
              </span>
              <SchoolBrand className="text-lg font-semibold tracking-tight" logoClassName="size-8" />
            </Link>

            <div className="relative max-w-lg">
              <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-indigo-400/15 text-indigo-200 ring-1 ring-white/10">
                <BookOpen className="size-7" />
              </div>
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-200">
                Your school, in sync
              </p>
              <h1 className="text-5xl font-semibold leading-[1.08] tracking-[-0.04em] xl:text-6xl">
                A better day starts with a clearer view.
              </h1>
              <p className="mt-6 max-w-md text-base leading-7 text-indigo-100/70">
                One thoughtful workspace for the people and moments that move your school forward.
              </p>
            </div>

            <div className="relative flex items-center gap-3 text-sm text-indigo-100/70">
              <ShieldCheck className="size-5 text-emerald-300" />
              Private, secure access for your school community
            </div>
          </section>

          <section className="flex items-center justify-center px-6 py-10 sm:px-12 lg:px-14">
            <div className="w-full max-w-md">
              <Link href="/dashboard" className="mb-10 flex items-center gap-2 lg:hidden">
                <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-950 text-white">
                  <GraduationCap className="size-5" />
                </span>
                <SchoolBrand className="font-semibold tracking-tight" logoClassName="size-7" />
              </Link>

              <div className="mb-8">
                <p className="mb-3 text-sm font-semibold text-indigo-700">WELCOME BACK</p>
                <h2 className="text-3xl font-semibold tracking-[-0.04em]">Sign in to your account</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Pick up right where your school community left off.
                </p>
              </div>

              {error && (
                <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              )}

              <Card className="border-0 bg-transparent py-0 shadow-none ring-0">
                <CardContent className="px-0">
                  <form onSubmit={handleCredentialsSignIn} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="email">Username or email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="text"
                        autoComplete="username"
                        placeholder="Enter your username or email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="h-11 rounded-xl border-slate-200 bg-white px-3.5"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                      </div>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        minLength={6}
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="h-11 rounded-xl border-slate-200 bg-white px-3.5"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={credentialsLoading || !!oauthLoading}
                      className="h-11 w-full rounded-xl bg-indigo-950 text-white hover:bg-indigo-900"
                    >
                      {credentialsLoading ? "Signing in..." : "Sign in"}
                      {!credentialsLoading && <ArrowRight className="ml-2 size-4" />}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <div className="my-6 flex items-center gap-4 text-xs font-medium text-slate-400">
                <span className="h-px flex-1 bg-slate-200" />
                OR CONTINUE WITH
                <span className="h-px flex-1 bg-slate-200" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!!oauthLoading || credentialsLoading}
                  onClick={() => handleOAuthSignIn("google")}
                  className="h-11 rounded-xl border-slate-200"
                >
                  <span className="mr-2 font-bold text-[#4285f4]">G</span>
                  {oauthLoading === "google" ? "Connecting..." : "Google"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={!!oauthLoading || credentialsLoading}
                  onClick={() => handleOAuthSignIn("github")}
                  className="h-11 rounded-xl border-slate-200"
                >
                  {oauthLoading === "github" ? "Connecting..." : "GitHub"}
                </Button>
              </div>

              <p className="mt-8 text-center text-sm text-slate-500">
                New to your school community?{" "}
                <Link href="/sign-up" className="font-semibold text-indigo-800 hover:text-indigo-600">
                  Create an account
                </Link>
              </p>
              <p className="mt-10 text-center text-xs text-slate-400">
                By continuing, you agree to your school&apos;s acceptable use policy.
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-[#f5f6fb] text-sm text-slate-500">Loading sign in...</main>}>
      <SignInContent />
    </Suspense>
  );
}
