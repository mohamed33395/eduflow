"use client";

import { useState } from "react";
import { useI18n } from "@/app/lib/i18n/client";

interface PasswordPhaseProps {
  identifier: string;
  onSubmit: (password: string) => void;
  onForgotPassword: () => void;
  loading?: boolean;
}

export function PasswordPhase({ identifier, onSubmit, onForgotPassword, loading }: PasswordPhaseProps) {
  const [password, setPassword] = useState("");
  const { t } = useI18n();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      onSubmit(password);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>

        <p className="text-sm text-slate-600 mb-2">
          {t("continuingAs")}: <span className="font-medium">{identifier}</span>
        </p>
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
          disabled={loading}
        />
      </div>
      <div className="text-right">
        <button
          type="button"
          onClick={onForgotPassword}
          className="text-sm text-indigo-600 hover:underline"
          disabled={loading}
        >
          {t("forgotPassword")}
        </button>
      </div>
      <button
        type="submit"
        disabled={loading || !password.trim()}
        className="w-full rounded-lg bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {loading ? t("signingIn") : t("login")}
      </button>
    </form>
  );
}
