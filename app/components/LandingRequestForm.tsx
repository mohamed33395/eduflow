"use client";

import { useState } from "react";
import { useI18n } from "@/app/lib/i18n/client";
import { Button } from "@/app/components/ui/button";
import { GraduationCap, UserRound } from "lucide-react";
import type { LandingLabels } from "@/app/types";

/**
 * Public booking/join form rendered on center & course landing pages.
 * Posts to the unauthenticated /api/landing-requests proxy → Nest public
 * endpoint. All strings can be overridden by the owner via landing.labels.
 */

interface LandingRequestFormProps {
  kind: "center" | "course";
  slug: string;
  accent: string;
  labels?: LandingLabels;
}

export function LandingRequestForm({
  kind,
  slug,
  accent,
  labels,
}: LandingRequestFormProps) {
  const { t } = useI18n();
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const lbl = (key: keyof LandingLabels, fallback: string) =>
    labels?.[key]?.trim() || fallback;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/landing-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          name,
          phone,
          email: email || undefined,
          message: message || undefined,
          website: website || undefined,
          ...(kind === "course" ? { courseSlug: slug } : { centerSlug: slug }),
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setDone(true);
    } catch {
      setError(t("requestError"));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-2xl bg-emerald-50 p-8 text-center">
        <p className="text-lg font-semibold text-emerald-700">
          {lbl("bookingSuccess", t("requestSuccess"))}
        </p>
      </div>
    );
  }

  const field =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";
  const roleBtn = (active: boolean) =>
    "flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition " +
    (active
      ? "border-transparent text-white"
      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300");

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setRole("student")}
          className={roleBtn(role === "student")}
          style={role === "student" ? { backgroundColor: accent } : undefined}
        >
          <GraduationCap size={16} />
          {lbl("bookingRoleStudent", t("requestStudent"))}
        </button>
        <button
          type="button"
          onClick={() => setRole("teacher")}
          className={roleBtn(role === "teacher")}
          style={role === "teacher" ? { backgroundColor: accent } : undefined}
        >
          <UserRound size={16} />
          {lbl("bookingRoleTeacher", t("requestTeacher"))}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={lbl("bookingNameLabel", t("requestName"))}
          className={field}
          maxLength={200}
        />
        <input
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder={lbl("bookingPhoneLabel", t("requestPhone"))}
          className={field}
          dir="ltr"
          maxLength={30}
        />
      </div>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={lbl("bookingEmailLabel", t("requestEmail"))}
        className={field}
        dir="ltr"
        maxLength={300}
      />
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={lbl("bookingMessageLabel", t("requestMessage"))}
        className={field}
        rows={3}
        maxLength={2000}
      />
      {/* honeypot — hidden from humans, bots fill it */}
      <input
        type="text"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button
        type="submit"
        loading={loading}
        className="w-full text-white"
        style={{ backgroundColor: accent }}
      >
        {lbl("bookingSubmitLabel", t("requestSubmit"))}
      </Button>
    </form>
  );
}
