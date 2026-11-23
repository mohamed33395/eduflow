"use client";

import { useState } from "react";
import { useI18n } from "@/app/lib/i18n/client";

interface ForgetPasswordPhaseProps {
  identifier: string;
  stepToken: string;
  onSubmit: (otp: string) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ForgetPasswordPhase({ identifier, onSubmit, onCancel, loading }: ForgetPasswordPhaseProps) {
  const [otp, setOtp] = useState("");
  const { t } = useI18n();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 5);
    setOtp(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length === 5) {
      onSubmit(otp);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-slate-600 mb-2">
          {t("otpSentToEmail")}: <span className="font-medium">{identifier}</span>
        </p>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {t("enterOtp")}
        </label>
        <input
          type="text"
          required
          maxLength={5}
          value={otp}
          onChange={handleChange}
          className="w-full rounded-lg border border-slate-300 px-4 py-2 text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="00000"
          disabled={loading}
        />
      </div>
      <button
        onClick={onCancel}
        className="text-sm text-slate-600 hover:text-slate-800"
        disabled={loading}
      >
        {t("backToLogin")}
      </button>
      <button
        onClick={handleSubmit}
        disabled={loading || otp.length !== 5}
        className="w-full rounded-lg bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {loading ? t("verifying") : t("verify")}
      </button>
    </div>
  );
}
