"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/app/lib/i18n/client";
import { getMyTasks, submitTaskSolution } from "@/app/services/tasks";
import { uploadFile } from "@/app/services/storage";
import { Button } from "@/app/components/ui/button";
import { StatusBadge } from "@/app/components/ui/status-badge";
import type { MyTaskItem } from "@/app/types";

export default function StudentTasksPage() {
  const { t } = useI18n();
  const [items, setItems] = useState<MyTaskItem[]>([]);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(() => {
    getMyTasks()
      .then(setItems)
      .catch((err) => console.error("[StudentTasksPage] load:", err));
  }, []);

  useEffect(load, [load]);

  const submit = async (item: MyTaskItem) => {
    const file = files[item.task.id];
    if (!file) return;
    setBusyId(item.task.id);
    setError("");
    try {
      const uploaded = await uploadFile(file, "submissions");
      await submitTaskSolution(item.task.id, uploaded.url);
      setFiles((p) => ({ ...p, [item.task.id]: null }));
      setNotice(t("solutionUploaded"));
      load();
    } catch (err) {
      console.error("[StudentTasksPage] submit:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        {t("myTasks")}
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

      {items.length === 0 && (
        <p className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          {t("noTasksYet")}
        </p>
      )}

      <div className="space-y-3">
        {items.map((item) => {
          const sub = item.mySubmission;
          const canSubmit = item.status === "pending" || item.status === "rejected";
          return (
            <div
              key={item.recipientId}
              className="rounded-xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {item.task.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {item.task.subject?.name}
                    {item.task.lesson?.title
                      ? ` — ${item.task.lesson.title}`
                      : ""}
                    {item.task.teacher?.user?.name
                      ? ` · ${item.task.teacher.user.name}`
                      : ""}
                  </p>
                </div>
                <StatusBadge status={item.status} label={t(item.status)} />
              </div>

              {item.status === "rejected" && (
                <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
                  {t("rejectedNote")}
                  {sub?.feedback ? ` — ${sub.feedback}` : ""}
                </p>
              )}
              {item.status === "graded" && sub && (
                <p className="mt-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
                  {t("score")}: {sub.grade ?? "—"}
                  {sub.feedback ? ` — ${sub.feedback}` : ""}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <a
                  href={item.task.examFileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-indigo-600 hover:underline"
                >
                  {t("downloadExam")}
                </a>

                {canSubmit && (
                  <>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                      onChange={(e) =>
                        setFiles((p) => ({
                          ...p,
                          [item.task.id]: e.target.files?.[0] ?? null,
                        }))
                      }
                      className="text-sm text-slate-600 file:me-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100 dark:text-slate-300"
                    />
                    <Button
                      size="sm"
                      disabled={!files[item.task.id] || busyId === item.task.id}
                      onClick={() => submit(item)}
                    >
                      {busyId === item.task.id
                        ? t("uploading")
                        : item.status === "rejected"
                          ? t("resubmit")
                          : t("uploadSolution")}
                    </Button>
                  </>
                )}

                {item.status === "submitted" && (
                  <span className="text-sm text-muted-foreground">
                    {t("pendingReview")}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
