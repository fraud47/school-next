"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowRight, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SchoolBrand } from "@/components/school-brand";
import { toast } from "react-toastify";

type SignUpRole = "parent" | "teacher" | "accountant";

function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<SignUpRole>("parent");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const toastId = toast.loading("Creating your account…");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role, inviteCode }),
      });
      const result: { error?: string } = await response.json();
      if (!response.ok) {
        const message = result.error || "Unable to create your account. Please try again.";
        setError(message);
        toast.update(toastId, { render: message, type: "error", isLoading: false, autoClose: 5000 });
        return;
      }

      const signInResult = await signIn("credentials", {
        email,
        password,
        callbackUrl,
        redirect: false,
      });
      if (signInResult?.error || !signInResult?.url) {
        const message = "Your account was created. Please sign in with your new credentials.";
        setError(message);
        toast.update(toastId, { render: message, type: "success", isLoading: false, autoClose: 5000 });
        return;
      }
      toast.update(toastId, { render: "Account created successfully.", type: "success", isLoading: false, autoClose: 1800 });
      router.push(signInResult.url);
    } catch {
      const message = "Unable to create your account right now. Please try again.";
      setError(message);
      toast.update(toastId, { render: message, type: "error", isLoading: false, autoClose: 5000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOAuthSignUp = (provider: "google" | "github") => {
    setOauthLoading(provider);
    setError(null);
    toast.loading(`Connecting to ${provider}…`, { toastId: "oauth-sign-up", autoClose: false });
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
              <p className="mb-4 text-sm font-semibold uppercase tracking-[0.2em] text-indigo-200">
                A place to grow together
              </p>
              <h1 className="text-5xl font-semibold leading-[1.08] tracking-[-0.04em] xl:text-6xl">
                Your school community starts here.
              </h1>
              <p className="mt-6 max-w-md text-base leading-7 text-indigo-100/70">
                Connect with your school and make every part of the learning journey feel a little more
                organized.
              </p>
            </div>

            <p className="relative text-sm text-indigo-100/70">
              A thoughtful workspace for families, teachers, and school teams.
            </p>
          </section>

          <section className="flex items-center justify-center px-6 py-10 sm:px-12 lg:px-14">
            <div className="w-full max-w-md">
              <Link href="/dashboard" className="mb-9 flex items-center gap-2 lg:hidden">
                <span className="flex size-10 items-center justify-center rounded-xl bg-indigo-950 text-white">
                  <GraduationCap className="size-5" />
                </span>
                <SchoolBrand className="font-semibold tracking-tight" logoClassName="size-7" />
              </Link>

              <div className="mb-7">
                <p className="mb-3 text-sm font-semibold text-indigo-700">GET STARTED</p>
                <h2 className="text-3xl font-semibold tracking-[-0.04em]">Create your account</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  Join your school community in just a few steps.
                </p>
              </div>

              {error && (
                <div role="alert" className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    name="name"
                    autoComplete="name"
                    minLength={2}
                    maxLength={100}
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Your name"
                    className="h-11 rounded-xl border-slate-200 bg-white px-3.5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="h-11 rounded-xl border-slate-200 bg-white px-3.5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    maxLength={128}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="At least 6 characters"
                    className="h-11 rounded-xl border-slate-200 bg-white px-3.5"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">I am joining as</Label>
                  <select
                    id="role"
                    name="role"
                    value={role}
                    onChange={(event) => setRole(event.target.value as SignUpRole)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <option value="parent">Parent</option>
                    <option value="teacher">Teacher</option>
                    <option value="accountant">Accountant</option>
                  </select>
                </div>
                {role !== "parent" && (
                  <div className="space-y-2">
                    <Label htmlFor="inviteCode">Staff invitation code</Label>
                    <Input
                      id="inviteCode"
                      name="inviteCode"
                      type="password"
                      autoComplete="one-time-code"
                      required
                      value={inviteCode}
                      onChange={(event) => setInviteCode(event.target.value)}
                      placeholder="Enter the code from your school"
                      className="h-11 rounded-xl border-slate-200 bg-white px-3.5"
                    />
                    <p className="text-xs leading-5 text-slate-500">
                      Staff registration requires an invitation code from your school.
                    </p>
                  </div>
                )}
                <p className="text-xs leading-5 text-slate-500">
                  Admin accounts can only be assigned by a trusted school administrator.
                </p>
                <Button
                  type="submit"
                  disabled={isSubmitting || !!oauthLoading}
                  className="h-11 w-full rounded-xl bg-indigo-950 text-white hover:bg-indigo-900"
                >
                  {isSubmitting ? "Creating account..." : "Create account"}
                  {!isSubmitting && <ArrowRight className="ml-2 size-4" />}
                </Button>
              </form>

              {role === "parent" && (
                <>
                  <div className="my-5 flex items-center gap-4 text-xs font-medium text-slate-400">
                    <span className="h-px flex-1 bg-slate-200" />
                    OR SIGN UP WITH
                    <span className="h-px flex-1 bg-slate-200" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!!oauthLoading || isSubmitting}
                      onClick={() => handleOAuthSignUp("google")}
                      className="h-11 rounded-xl border-slate-200"
                    >
                      <span className="mr-2 font-bold text-[#4285f4]">G</span>
                      {oauthLoading === "google" ? "Connecting..." : "Google"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!!oauthLoading || isSubmitting}
                      onClick={() => handleOAuthSignUp("github")}
                      className="h-11 rounded-xl border-slate-200"
                    >
                      {oauthLoading === "github" ? "Connecting..." : "GitHub"}
                    </Button>
                  </div>
                </>
              )}

              <p className="mt-7 text-center text-sm text-slate-500">
                Already have an account?{" "}
                <Link href="/sign-in" className="font-semibold text-indigo-800 hover:text-indigo-600">
                  Sign in
                </Link>
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center bg-[#f5f6fb] text-sm text-slate-500">Loading sign up...</main>}>
      <SignUpContent />
    </Suspense>
  );
}
