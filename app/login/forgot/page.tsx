"use client";

import { useState } from "react";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/app/lib/firebase";
import { useI18n } from "@/app/lib/i18n/client";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage(t("checkEmailForResetLink"));
    } catch (err) {
      console.error("[ForgotPassword] error:", err);
      const authErr = err as { code?: string; message?: string };
      if (authErr.code === "auth/user-not-found") {
        setError(t("noAccountFound"));
      } else if (authErr.code === "auth/invalid-email") {
        setError(t("invalidEmailAddress"));
      } else if (authErr.code === "auth/too-many-requests") {
        setError(t("tooManyRequestsLater"));
      } else {
        setError(authErr.message || t("failedToSendResetEmail"));
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
          <p className="text-slate-500 mt-2">{t("resetYourPassword")}</p>
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
              placeholder="you@example.com"
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {message && <p className="text-green-600 text-sm">{message}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {loading ? t("sending") : t("sendResetLink")}
          </button>
          <p className="text-center text-sm text-slate-500">
            <Link href="/login" className="text-indigo-600 hover:underline">
              {t("backToSignIn")}
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
