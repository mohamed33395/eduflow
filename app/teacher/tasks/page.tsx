"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/app/lib/i18n/client";
import {
  getReviewQueue,
  reviewTaskSubmission,
  sendTaskResult,
} from "@/app/services/tasks";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { StatusBadge } from "@/app/components/ui/status-badge";
import type { ReviewSubmission } from "@/app/types";

interface ReviewForm {
  grade: string;
  feedback: string;
}

export default function TeacherTasksPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<ReviewSubmission[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [forms, setForms] = useState<Record<string, ReviewForm>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingWaIds, setPendingWaIds] = useState<Record<string, boolean>>({});

  const load = useCallback(() => {
    getReviewQueue()
      .then(setItems)
      .catch((err) => console.error("[TeacherTasksPage] load:", err));
  }, []);

  useEffect(load, [load]);

  const formFor = (id: string): ReviewForm =>
    forms[id] ?? { grade: "", feedback: "" };

  const review = async (sub: ReviewSubmission, action: "accept" | "reject") => {
    const f = formFor(sub.id);
    if (action === "accept" && f.grade.trim() === "") {
      setError(t("gradeRequired"));
      return;
    }
    setBusyId(sub.id);
    setError("");
    try {
      await reviewTaskSubmission(sub.id, {
        action,
        grade: action === "accept" ? Number(f.grade) : undefined,
        feedback: f.feedback.trim() || undefined,
      });
      setOpenId(null);
      load();
    } catch (err) {
      console.error("[TeacherTasksPage] review:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  const sendResult = async (sub: ReviewSubmission) => {
    if (pendingWaIds[sub.id]) {
      await sendTaskResult(sub.id, true).catch(() => null);
      setPendingWaIds((p) => ({ ...p, [sub.id]: false }));
      load();
      return;
    }
    setBusyId(sub.id);
    try {
      const res = await sendTaskResult(sub.id);
      if (res.waUrl) {
        window.open(res.waUrl, "_blank");
        setPendingWaIds((p) => ({ ...p, [sub.id]: true }));
        setNotice(t("sentViaWhatsApp"));
      } else if (res.sent) {
        load();
      }
    } catch (err) {
      console.error("[TeacherTasksPage] send result:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  const pending = items.filter((i) => i.status === "submitted");
  const reviewed = items.filter((i) => i.status !== "submitted");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        {t("teacherReview")}
      </h1>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          {notice}
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          {t("pendingReview")} ({pending.length})
        </h2>
        {pending.length === 0 && (
          <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            {t("noSubmissions")}
          </p>
        )}
        {pending.map((sub) => (
          <div
            key={sub.id}
            className="rounded-xl border border-border bg-card p-4 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {sub.studentName} — {sub.taskTitle}
                </p>
                <p className="text-sm text-muted-foreground">
                  {sub.subjectName} · {t("attempts")}: {sub.attempts}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={sub.status} label={t(sub.status)} />
                <a
                  href={sub.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-indigo-600 hover:underline"
                >
                  {t("viewSolution")}
                </a>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setOpenId(openId === sub.id ? null : sub.id)}
                >
                  {t("review")}
                </Button>
              </div>
            </div>

            {openId === sub.id && (
              <div className="mt-4 space-y-3 border-t border-border pt-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    label={t("grade")}
                    type="number"
                    min={0}
                    value={formFor(sub.id).grade}
                    onChange={(e) =>
                      setForms((p) => ({
                        ...p,
                        [sub.id]: { ...formFor(sub.id), grade: e.target.value },
                      }))
                    }
                  />
                  <Input
                    label={t("feedback")}
                    value={formFor(sub.id).feedback}
                    onChange={(e) =>
                      setForms((p) => ({
                        ...p,
                        [sub.id]: {
                          ...formFor(sub.id),
                          feedback: e.target.value,
                        },
                      }))
                    }
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    disabled={busyId === sub.id}
                    onClick={() => review(sub, "accept")}
                  >
                    {t("accept")}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busyId === sub.id}
                    onClick={() => review(sub, "reject")}
                  >
                    {t("reject")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </section>

      {reviewed.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground">
            {t("graded")} / {t("rejected")} ({reviewed.length})
          </h2>
          {reviewed.map((sub) => (
            <div
              key={sub.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <div>
                <p className="font-medium">
                  {sub.studentName} — {sub.taskTitle}
                </p>
                <p className="text-sm text-muted-foreground">
                  {sub.subjectName}
                  {sub.grade !== undefined ? ` · ${t("score")}: ${sub.grade}` : ""}
                  {sub.feedback ? ` · ${sub.feedback}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={sub.status} label={t(sub.status)} />
                {sub.status === "graded" &&
                  (sub.resultSentAt ? (
                    <span className="text-sm text-green-600">
                      {t("resultSent")}
                    </span>
                  ) : pendingWaIds[sub.id] ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => sendResult(sub)}
                    >
                      {t("confirmSent")}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === sub.id}
                      onClick={() => sendResult(sub)}
                    >
                      {t("sendResult")}
                    </Button>
                  ))}
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
