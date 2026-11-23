"use client";

import { useState } from "react";
import { useI18n } from "@/app/lib/i18n/client";

interface ResetPasswordPhaseProps {
  identifier: string;
  verifiedToken: string;
  onSubmit: (password: string, confirmation: string) => void;
  loading?: boolean;
}

export function ResetPasswordPhase({ identifier, onSubmit, loading }: ResetPasswordPhaseProps) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const { t } = useI18n();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate password
    if (password.length < 8) {
      setError(t("passwordTooShort"));
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError(t("passwordNeedsUppercase"));
      return;
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      setError(t("passwordNeedsSpecial"));
      return;
    }
    if (password !== confirmation) {
      setError(t("passwordsDoNotMatch"));
      return;
    }

    onSubmit(password, confirmation);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <p className="text-sm text-slate-600 mb-2">
          {t("resettingFor")}: <span className="font-medium">{identifier}</span>
        </p>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {t("newPassword")}
        </label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="••••••••"
          disabled={loading}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {t("confirmPassword")}
        </label>
        <input
          type="password"
          required
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="••••••••"
          disabled={loading}
        />
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading || !password || !confirmation}
        className="w-full rounded-lg bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {loading ? t("resetting") : t("resetPassword")}
      </button>
    </form>
  );
}
