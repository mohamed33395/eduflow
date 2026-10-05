"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { useI18n } from "@/app/lib/i18n/client";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [step, setStep] = useState<"send" | "reset">("send");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [channel, setChannel] = useState<"sms" | "whatsapp">("sms");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [debugCode, setDebugCode] = useState("");

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, channel }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || t("failedToSendCode"));
      }
      if (data.debugCode) {
        setDebugCode(data.debugCode as string);
        setSuccess(t("providerNotConfigured"));
      } else {
        setSuccess(t("verificationCodeSent"));
      }
      setStep("reset");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failedToSendCode"));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await fetch("/api/forgot-password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || t("failedToResetPassword"));
      }
      setSuccess(t("passwordChangedRedirecting"));
      setTimeout(() => router.push("/login"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failedToResetPassword"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-md">
        <h1 className="mb-2 text-2xl font-bold text-slate-900">
          {t("resetPassword")}
        </h1>
        <p className="mb-6 text-sm text-slate-500">
          {t("enterRegisteredPhone")}
        </p>

        {error && <p className="mb-4 text-red-600 text-sm">{error}</p>}
        {success && <p className="mb-4 text-green-600 text-sm">{success}</p>}
        {debugCode && (
          <p className="mb-4 rounded bg-yellow-50 p-2 text-sm text-yellow-800">
            {t("testCode")}: <strong>{debugCode}</strong>
          </p>
        )}

        {step === "send" ? (
          <form onSubmit={handleSend} className="space-y-5">
            <Input
              label={t("phone")}
              type="tel"
              required
              placeholder="+20 1XX XXX XXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                {t("sendCodeVia")}
              </label>
              <select
                value={channel}
                onChange={(e) =>
                  setChannel(e.target.value as "sms" | "whatsapp")
                }
                className="w-full rounded-lg border border-slate-300 px-4 py-2"
              >
                <option value="sms">SMS</option>
                <option value="whatsapp">WhatsApp</option>
              </select>
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? t("sending") : t("sendCode")}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-5">
            <Input
              label={t("verificationCode")}
              type="text"
              required
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <Input
              label={t("newPassword")}
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Button type="submit" disabled={loading}>
              {loading ? t("resetting") : t("resetPassword")}
            </Button>
            <button
              type="button"
              onClick={() => setStep("send")}
              className="text-sm text-indigo-600 hover:underline"
            >
              {t("resendCode")}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-slate-600">
          <Link href="/login" className="text-indigo-600 hover:underline">
            {t("backToLogin")}
          </Link>
        </div>
      </div>
    </div>
  );
}
