"use client";

import { useState } from "react";
import { useI18n } from "@/app/lib/i18n/client";

interface OtpPhaseProps {
  identifier: string;
  channel: "mail" | "sms";
  onSubmit: (otp: string) => void;
  onResend: () => void;
  loading?: boolean;
}

export function OtpPhase({ identifier, channel, onSubmit, onResend, loading }: OtpPhaseProps) {
  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(59);
  const [canResend, setCanResend] = useState(false);
  const { t } = useI18n();

  // Handle OTP input (5 digits for Constrix compatibility)
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 5);
    setOtp(value);
  };

  // Countdown timer for resend
  useState(() => {
    if (countdown > 0 && !canResend) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && !canResend) {
      setCanResend(true);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length === 5) {
      onSubmit(otp);
    }
  };

  const handleResend = () => {
    setCountdown(59);
    setCanResend(false);
    onResend();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <p className="text-sm text-slate-600 mb-2">
          {channel === "mail" ? t("otpSentToEmail") : t("otpSentToPhone")}:{" "}
          <span className="font-medium">{identifier}</span>
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
      <div className="text-center">
        {canResend ? (
          <button
            type="button"
            onClick={handleResend}
            className="text-sm text-indigo-600 hover:underline"
            disabled={loading}
          >
            {t("resendOtp")}
          </button>
        ) : (
          <p className="text-sm text-slate-500">
            {t("resendIn")} {countdown}s
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={loading || otp.length !== 5}
        className="w-full rounded-lg bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {loading ? t("verifying") : t("verify")}
      </button>
    </form>
  );
}
