"use client";

import { useState } from "react";
import { useI18n } from "@/app/lib/i18n/client";

interface IdentifierPhaseProps {
  onSubmit: (identifier: string) => void;
  loading?: boolean;
}

export function IdentifierPhase({ onSubmit, loading }: IdentifierPhaseProps) {
  const [identifier, setIdentifier] = useState("");
  const { t } = useI18n();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (identifier.trim()) {
      onSubmit(identifier.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {t("emailOrPhone")}
        </label>
        <input
          type="text"
          required
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="email@example.com or 05xxxxxxxx"
          disabled={loading}
        />
      </div>
      <button
        type="submit"
        disabled={loading || !identifier.trim()}
        className="w-full rounded-lg bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {loading ? t("loading") : t("continue")}
      </button>
    </form>
  );
}
