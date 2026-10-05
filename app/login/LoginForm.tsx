"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signInWithEmailAndPassword, type AuthError } from "firebase/auth";
import { app, auth } from "@/app/lib/firebase";
import { useI18n } from "@/app/lib/i18n/client";
import type { AppUser } from "@/app/types";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await cred.user.getIdToken();
      const res = await fetch("/api/auth/session", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || t("sessionCreationFailed"));
      }

      const data = await res.json().catch(() => ({ role: "student" as AppUser["role"] }));
      const role = data.role ?? "student";
      const redirect = searchParams.get("redirect");
      router.replace(resolveRedirect(redirect, role));
    } catch (err) {
      console.error("[LoginForm] error:", err, {
        projectId: app.options.projectId,
        authDomain: app.options.authDomain,
        email,
      });
      const authErr = err as AuthError;
      if (authErr.code) {
        switch (authErr.code) {
          case "auth/user-not-found":
          case "auth/invalid-credential":
          case "auth/wrong-password":
            setError(t("invalidEmailOrPassword"));
            break;
          case "auth/invalid-email":
            setError(t("invalidEmailAddress"));
            break;
          case "auth/user-disabled":
            setError(t("accountDisabled"));
            break;
          case "auth/too-many-requests":
            setError(t("tooManyRequests"));
            break;
          default:
            setError(`${t("loginFailed")}: ${authErr.message}`);
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t("unexpectedError"));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">EduFlow</h1>
          <p className="text-slate-500 mt-2">{t("signInToDashboard")}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t("email")}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {t("password")}
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="••••••••"
            />
            <div className="mt-1 text-right">
              <Link
                href="/forgot-password"
                className="text-sm text-indigo-600 hover:underline"
              >
                {t("forgotPassword")}
              </Link>
            </div>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? t("signingIn") : t("login")}
          </button>

        </form>
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
