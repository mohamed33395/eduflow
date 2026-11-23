"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  GraduationCap,
  Building2,
  Users,
  BookOpen,
  Eye,
  EyeOff,
} from "lucide-react";
import { useI18n } from "@/app/lib/i18n/client";
import { useAuth } from "@/app/hooks/useAuth";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { FormAlert } from "@/app/components/ui/form-alert";
import type { AppUser } from "@/app/types";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await signIn(email, password);
      const redirect = searchParams.get("redirect");
      router.replace(resolveRedirect(redirect, user.role));
      router.refresh();
    } catch (err) {
      console.error("[LoginForm] error:", err);
      const status = (err as { status?: number }).status;
      if (status === 401) {
        setError(t("invalidEmailOrPassword"));
      } else if (status === 403) {
        setError(t("accountDisabled"));
      } else if (status === 503) {
        setError(t("serverUnavailable"));
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t("unexpectedError"));
      }
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Building2, label: t("centers") },
    { icon: BookOpen, label: t("courses") },
    { icon: Users, label: t("teachers") },
    { icon: GraduationCap, label: t("students") },
  ];

  return (
    <main className="flex min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      {/* Brand panel — desktop only */}
      <aside className="relative hidden w-1/2 overflow-hidden bg-indigo-950 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -start-24 -top-24 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute -bottom-32 -end-24 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="relative flex items-center gap-3 px-10 pt-10">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-indigo-200">
            <GraduationCap size={20} />
          </span>
          <span className="text-lg font-bold tracking-tight">EduFlow</span>
        </div>
        <div className="relative px-10 pb-14">
          <p className="max-w-sm text-2xl font-semibold leading-snug text-indigo-100">
            {t("brandTagline")}
          </p>
          <ul className="mt-8 flex flex-wrap gap-2.5">
            {features.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-sm text-indigo-200"
              >
                <Icon size={14} aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Form panel */}
      <div className="flex flex-1 items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-xl shadow-slate-900/5 sm:p-10">
            <div className="mb-8">
              <span className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600 text-white lg:hidden">
                <GraduationCap size={22} />
              </span>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                EduFlow
              </h1>
              <p className="mt-1.5 text-sm text-slate-500">
                {t("signInToDashboard")}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label={t("email")}
                type="email"
                required
                autoComplete="username email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                className="h-11 rounded-xl"
              />
              <div className="relative">
                <Input
                  label={t("password")}
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-11 rounded-xl pe-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={t(showPassword ? "hidePassword" : "showPassword")}
                  className="absolute bottom-[11px] end-3 flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div className="flex justify-end">
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-indigo-600 transition-colors hover:text-indigo-700 hover:underline"
                >
                  {t("forgotPassword")}
                </Link>
              </div>

              <FormAlert variant="error">{error}</FormAlert>

              <Button
                type="submit"
                loading={loading}
                size="lg"
                className="w-full rounded-xl font-semibold"
              >
                {loading ? t("signingIn") : t("login")}
              </Button>
            </form>
          </div>
          <p className="mt-6 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} EduFlow
          </p>
        </div>
      </div>
    </main>
  );
}

function getHomeForRole(role: AppUser["role"]): string {
  switch (role) {
    case "super_admin":
      return "/admin";
    case "center_owner":
      return "/center";
    case "course_owner":
      return "/course";
    case "teacher":
      return "/teacher";
    case "student":
      return "/student";
    default:
      return "/";
  }
}

function resolveRedirect(redirect: string | null, role: AppUser["role"]): string {
  if (!redirect) return getHomeForRole(role);
  const home = getHomeForRole(role);
  // allow only redirect that matches the user's role
  if (role === "super_admin" && redirect.startsWith("/admin")) return redirect;
  if (role === "center_owner" && redirect.startsWith("/center")) return redirect;
  if (role === "course_owner" && redirect.startsWith("/course")) return redirect;
  if (role === "teacher" && redirect.startsWith("/teacher")) return redirect;
  if (role === "student" && redirect.startsWith("/student")) return redirect;
  return home;
}
