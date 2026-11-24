"use client";

import { useState } from "react";
import { api } from "@/app/lib/api";
import { useI18n } from "@/app/lib/i18n/client";
import { Button } from "@/app/components/ui/button";
import {
  GraduationCap,
  UserRound,
  Phone,
  Mail,
  Trash2,
} from "lucide-react";
import type { LandingRequest, LandingRequestStatus } from "@/app/types";

/**
 * Dashboard list of booking/join requests that came through the public
 * landing page. Shared by the center and course dashboards — the backend
 * scopes results to the signed-in owner.
 */

const STATUSES: LandingRequestStatus[] = [
  "pending",
  "contacted",
  "accepted",
  "rejected",
];

const statusColor: Record<LandingRequestStatus, string> = {
  pending: "bg-amber-100 text-amber-700",
  contacted: "bg-sky-100 text-sky-700",
  accepted: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
};

export function LandingRequestsList({ initial }: { initial: LandingRequest[] }) {
  const { t, locale } = useI18n();
  const [items, setItems] = useState(initial);
  const [busyId, setBusyId] = useState("");

  const setStatus = async (id: string, status: LandingRequestStatus) => {
    setBusyId(id);
    try {
      const updated = await api.patch<LandingRequest>(
        `/landing-requests/${id}`,
        { status }
      );
      setItems((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } finally {
      setBusyId("");
    }
  };

  const remove = async (id: string) => {
    setBusyId(id);
    try {
      await api.delete(`/landing-requests/${id}`);
      setItems((prev) => prev.filter((r) => r.id !== id));
    } finally {
      setBusyId("");
    }
  };

  if (!items.length) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-slate-500 dark:border-slate-700">
        {t("noRequests")}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((r) => (
        <div
          key={r.id}
          className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700">
                {r.role === "teacher" ? (
                  <UserRound size={18} />
                ) : (
                  <GraduationCap size={18} />
                )}
              </span>
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {r.name}
                </p>
                <p className="text-xs text-slate-500">
                  {r.role === "teacher"
                    ? t("requestTeacher")
                    : t("requestStudent")}
                  {r.course?.name ? ` · ${r.course.name}` : ""} ·{" "}
                  {new Date(r.createdAt).toLocaleDateString(locale)}
                </p>
              </div>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor[r.status] ?? statusColor.pending}`}
            >
              {t(`request_${r.status}`)}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-300">
            <a href={`tel:${r.phone}`} className="flex items-center gap-1.5">
              <Phone size={14} />
              <span dir="ltr">{r.phone}</span>
            </a>
            {r.email && (
              <a
                href={`mailto:${r.email}`}
                className="flex items-center gap-1.5"
              >
                <Mail size={14} />
                <span dir="ltr">{r.email}</span>
              </a>
            )}
          </div>

          {r.message && (
            <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              {r.message}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {STATUSES.map((s) => (
              <Button
                key={s}
                type="button"
                size="sm"
                variant={r.status === s ? "default" : "outline"}
                loading={busyId === r.id}
                onClick={() => setStatus(r.id, s)}
              >
                {t(`request_${s}`)}
              </Button>
            ))}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="ms-auto px-2 text-red-600"
              loading={busyId === r.id}
              onClick={() => remove(r.id)}
            >
              <Trash2 size={16} />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
