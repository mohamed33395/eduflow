"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/app/hooks/useAuth";
import { useI18n } from "@/app/lib/i18n/client";
import { getClasses } from "@/app/services/classes";
import { getSubjects } from "@/app/services/subjects";
import {
  createTask,
  getTask,
  getTaskFormData,
  getTasks,
  sendTaskResult,
} from "@/app/services/tasks";
import { uploadFile } from "@/app/services/storage";
import {
  DOC_IMAGE_EXTS,
  uploadErrorMessage,
  validateUploadFile,
} from "@/app/lib/validators";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Select } from "@/app/components/ui/select";
import { StatusBadge } from "@/app/components/ui/status-badge";
import { Table } from "@/app/components/ui/table";
import type {
  CenterTask,
  Class,
  Subject,
  TaskDetail,
  TaskFormData,
  TaskStudentRow,
} from "@/app/types";

function StatChip({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {value} {label}
    </span>
  );
}

function TabPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-indigo-600 text-white shadow-sm"
          : "border border-border bg-card text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
      }`}
    >
      {children}
    </button>
  );
}

const ALL = "all";
const NONE_CLASS = "__none__";

const currentMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

export default function CenterTasksPage() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const centerId = user?.centerId ?? "";

  const [tasks, setTasks] = useState<CenterTask[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [activeClassId, setActiveClassId] = useState<string>(ALL);
  const [activeSubjectId, setActiveSubjectId] = useState<string>(ALL);
  const [month, setMonth] = useState<string>(currentMonthKey());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TaskDetail | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [form, setForm] = useState({
    title: "",
    subjectId: "",
    teacherId: "",
    lessonId: "",
  });
  const [formData, setFormData] = useState<TaskFormData | null>(null);
  const [examFile, setExamFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [sendingIds, setSendingIds] = useState<Record<string, boolean>>({});
  const [pendingWaIds, setPendingWaIds] = useState<Record<string, boolean>>({});

  const loadTasks = useCallback(() => {
    if (!centerId) return;
    getTasks(centerId)
      .then(setTasks)
      .catch((err) => console.error("[CenterTasksPage] load:", err));
  }, [centerId]);

  useEffect(() => {
    if (!centerId) return;
    loadTasks();
    getSubjects({ centerId })
      .then(setSubjects)
      .catch((err) => console.error("[CenterTasksPage] subjects:", err));
    getClasses(centerId)
      .then(setClasses)
      .catch((err) => console.error("[CenterTasksPage] classes:", err));
  }, [centerId, loadTasks]);

  // When the subject changes, reset dependent fields and load its
  // teachers / lessons / recipient count.
  const handleSubjectChange = (subjectId: string) => {
    setFormData(null);
    setForm((f) => ({ ...f, subjectId, teacherId: "", lessonId: "" }));
    if (!subjectId) return;
    getTaskFormData(subjectId)
      .then(setFormData)
      .catch((err) => console.error("[CenterTasksPage] form-data:", err));
  };

  const toggleDetail = async (taskId: string) => {
    if (expandedId === taskId) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(taskId);
    try {
      setDetail(await getTask(taskId));
    } catch (err) {
      console.error("[CenterTasksPage] detail:", err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examFile || !form.teacherId) return;
    setBusy(true);
    setError("");
    try {
      const uploaded = await uploadFile(examFile, "tasks");
      const created = await createTask({
        title: form.title.trim(),
        subjectId: form.subjectId,
        teacherId: form.teacherId,
        lessonId: form.lessonId || undefined,
        examFileUrl: uploaded.url,
      });
      setTasks((prev) => [created, ...prev]);
      setShowForm(false);
      setForm({ title: "", subjectId: "", teacherId: "", lessonId: "" });
      setExamFile(null);
      setFormData(null);
      setNotice(t("taskCreated"));
    } catch (err) {
      console.error("[CenterTasksPage] create:", err);
      setError(uploadErrorMessage(err, t));
    } finally {
      setBusy(false);
    }
  };

  const pickExamFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    const bad = validateUploadFile(f, {
      extensions: DOC_IMAGE_EXTS,
      maxMb: 20,
    });
    if (f && bad) {
      setExamFile(null);
      e.target.value = "";
      setError(t(bad));
      return;
    }
    setError("");
    setExamFile(f);
  };

  const handleSendResult = async (s: TaskStudentRow) => {
    if (!s.submissionId) return;
    // Second click after wa.me opened → just mark as sent.
    if (pendingWaIds[s.submissionId]) {
      await sendTaskResult(s.submissionId, true).catch(() => null);
      setPendingWaIds((p) => ({ ...p, [s.submissionId!]: false }));
      setDetail((d) =>
        d
          ? {
              ...d,
              students: d.students.map((x) =>
                x.submissionId === s.submissionId
                  ? { ...x, resultSentAt: new Date().toISOString() }
                  : x
              ),
            }
          : d
      );
      return;
    }
    setSendingIds((p) => ({ ...p, [s.submissionId!]: true }));
    try {
      const res = await sendTaskResult(s.submissionId);
      if (res.waUrl) {
        window.open(res.waUrl, "_blank");
        setPendingWaIds((p) => ({ ...p, [s.submissionId!]: true }));
        setNotice(t("sentViaWhatsApp"));
      } else if (res.sent) {
        setDetail((d) =>
          d
            ? {
                ...d,
                students: d.students.map((x) =>
                  x.submissionId === s.submissionId
                    ? { ...x, resultSentAt: res.resultSentAt }
                    : x
                ),
              }
            : d
        );
      }
    } catch (err) {
      console.error("[CenterTasksPage] send result:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSendingIds((p) => ({ ...p, [s.submissionId!]: false }));
    }
  };

  // ── tabs & month filter ──────────────────────────────────────────
  // Subjects the tasks reference (includes subjects deleted from settings).
  const subjectTabsList = useMemo(() => {
    const list = subjects.map((s) => ({
      id: s.id,
      name: s.name,
      classId: s.classId ?? "",
    }));
    const known = new Set(list.map((s) => s.id));
    for (const task of tasks) {
      if (!known.has(task.subjectId)) {
        known.add(task.subjectId);
        list.push({ id: task.subjectId, name: task.subjectName, classId: "" });
      }
    }
    return list;
  }, [subjects, tasks]);

  const classOfSubject = useMemo(
    () => new Map(subjectTabsList.map((s) => [s.id, s.classId])),
    [subjectTabsList]
  );

  const hasUnassigned = subjectTabsList.some((s) => !s.classId);

  const subjectTabs =
    activeClassId === ALL
      ? subjectTabsList
      : subjectTabsList.filter(
          (s) =>
            s.classId === (activeClassId === NONE_CLASS ? "" : activeClassId)
        );

  // Distinct months present in the data (current month always offered).
  const monthKeys = useMemo(() => {
    const keys = new Set<string>([currentMonthKey()]);
    for (const task of tasks) {
      if (task.createdAt) keys.add(task.createdAt.slice(0, 7));
    }
    return [...keys].sort().reverse();
  }, [tasks]);

  const monthOptions = [
    ...monthKeys.map((m) => ({
      value: m,
      label: new Date(
        Number(m.slice(0, 4)),
        Number(m.slice(5, 7)) - 1,
        1
      ).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
        month: "long",
        year: "numeric",
      }),
    })),
    { value: ALL, label: t("allMonths") },
  ];

  const selectClassTab = (cid: string) => {
    setActiveClassId(cid);
    setActiveSubjectId(ALL);
  };

  const visibleTasks = useMemo(
    () =>
      tasks.filter((task) => {
        if (month !== ALL && !task.createdAt.startsWith(month)) return false;
        if (activeSubjectId !== ALL && task.subjectId !== activeSubjectId)
          return false;
        if (activeClassId !== ALL) {
          const cid = classOfSubject.get(task.subjectId) ?? "";
          if (cid !== (activeClassId === NONE_CLASS ? "" : activeClassId))
            return false;
        }
        return true;
      }),
    [tasks, month, activeSubjectId, activeClassId, classOfSubject]
  );

  const totals = useMemo(
    () =>
      visibleTasks.reduce(
        (acc, task) => ({
          notified: acc.notified + task.stats.notified,
          submitted: acc.submitted + task.stats.submitted,
          graded: acc.graded + task.stats.graded,
          rejected: acc.rejected + task.stats.rejected,
          pending: acc.pending + task.stats.pending,
        }),
        { notified: 0, submitted: 0, graded: 0, rejected: 0, pending: 0 }
      ),
    [visibleTasks]
  );

  const subjectOptions = [
    { value: "", label: t("selectSubject") },
    ...subjects.map((s) => ({ value: s.id, label: s.name })),
  ];
  const teacherOptions = [
    {
      value: "",
      label: formData?.teachers.length
        ? t("selectTeacher")
        : t("noTeachersForSubject"),
    },
    ...(formData?.teachers ?? []).map((x) => ({ value: x.id, label: x.name })),
  ];
  const lessonOptions = [
    {
      value: "",
      label: formData?.lessons.length
        ? t("selectLesson")
        : t("noLessonsForSubject"),
    },
    ...(formData?.lessons ?? []).map((x) => ({ value: x.id, label: x.title })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t("tasks")}
        </h1>
        <div className="flex items-center gap-2">
          <div className="w-48">
            <Select
              aria-label={t("month")}
              value={month}
              options={monthOptions}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
          <Button onClick={() => setShowForm((v) => !v)}>
            {showForm ? t("cancel") : t("addTask")}
          </Button>
        </div>
      </div>

      {(classes.length > 0 || hasUnassigned) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-muted-foreground">
            {t("classGroup")}:
          </span>
          <TabPill
            active={activeClassId === ALL}
            onClick={() => selectClassTab(ALL)}
          >
            {t("all")}
          </TabPill>
          {classes.map((c) => (
            <TabPill
              key={c.id}
              active={activeClassId === c.id}
              onClick={() => selectClassTab(c.id)}
            >
              {c.name}
            </TabPill>
          ))}
          {hasUnassigned && (
            <TabPill
              active={activeClassId === NONE_CLASS}
              onClick={() => selectClassTab(NONE_CLASS)}
            >
              {t("unassigned")}
            </TabPill>
          )}
        </div>
      )}

      {subjectTabsList.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-muted-foreground">
            {t("subjects")}:
          </span>
          <TabPill
            active={activeSubjectId === ALL}
            onClick={() => setActiveSubjectId(ALL)}
          >
            {t("all")}
          </TabPill>
          {subjectTabs.map((s) => (
            <TabPill
              key={s.id}
              active={activeSubjectId === s.id}
              onClick={() => setActiveSubjectId(s.id)}
            >
              {s.name}
            </TabPill>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-4 py-3">
        <span className="text-sm font-semibold text-slate-900 dark:text-white">
          {visibleTasks.length} {t("tasks")}
        </span>
        <StatChip
          label={t("notified")}
          value={totals.notified}
          className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
        />
        <StatChip
          label={t("submitted")}
          value={totals.submitted + totals.graded}
          className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
        />
        <StatChip
          label={t("notSubmitted")}
          value={totals.pending}
          className="bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
        />
        <StatChip
          label={t("graded")}
          value={totals.graded}
          className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
        />
      </div>

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

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm"
        >
          <h2 className="text-lg font-semibold">{t("createTask")}</h2>
          <Input
            label={t("title")}
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label={t("subjects")}
              required
              value={form.subjectId}
              options={subjectOptions}
              onChange={(e) => handleSubjectChange(e.target.value)}
            />
            <Select
              label={t("teacher")}
              required
              value={form.teacherId}
              options={teacherOptions}
              onChange={(e) =>
                setForm({ ...form, teacherId: e.target.value })
              }
            />
          </div>
          <Select
            label={t("lesson")}
            value={form.lessonId}
            options={lessonOptions}
            onChange={(e) => setForm({ ...form, lessonId: e.target.value })}
          />
          {formData && (
            <p className="text-sm text-muted-foreground">
              {formData.studentCount} {t("studentsWillBeNotified")}
            </p>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              {t("examFile")} *
            </label>
            <input
              type="file"
              required
              accept={DOC_IMAGE_EXTS.join(",")}
              onChange={pickExamFile}
              className="block w-full text-sm text-slate-600 file:me-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100 dark:text-slate-300"
            />
          </div>
          <Button type="submit" disabled={busy || !examFile || !form.teacherId}>
            {busy ? t("uploading") : t("createTask")}
          </Button>
        </form>
      )}

      <div className="space-y-3">
        {visibleTasks.length === 0 && (
          <p className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
            {t("noTasksYet")}
          </p>
        )}
        {visibleTasks.map((task) => (
          <div
            key={task.id}
            className="rounded-xl border border-border bg-card shadow-sm"
          >
            <button
              type="button"
              onClick={() => toggleDetail(task.id)}
              className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-start"
            >
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">
                  {task.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  {task.subjectName}
                  {task.lessonTitle ? ` — ${task.lessonTitle}` : ""} ·{" "}
                  {task.teacherName}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatChip
                  label={t("notified")}
                  value={task.stats.notified}
                  className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                />
                <StatChip
                  label={t("submitted")}
                  value={task.stats.submitted + task.stats.graded}
                  className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                />
                <StatChip
                  label={t("notSubmitted")}
                  value={task.stats.pending}
                  className="bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                />
                <StatChip
                  label={t("graded")}
                  value={task.stats.graded}
                  className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                />
              </div>
            </button>

            {expandedId === task.id && detail?.id === task.id && (
              <div className="border-t border-border px-5 py-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-muted-foreground">
                    {t("studentsStatus")}
                  </h3>
                  <a
                    href={task.examFileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-indigo-600 hover:underline"
                  >
                    {t("downloadExam")}
                  </a>
                </div>
                <Table
                  columns={[
                    {
                      key: "name",
                      header: t("name"),
                      render: (s: TaskStudentRow) => (
                        <span className="font-medium">{s.name}</span>
                      ),
                    },
                    {
                      key: "status",
                      header: t("status"),
                      render: (s: TaskStudentRow) => (
                        <StatusBadge status={s.status} label={t(s.status)} />
                      ),
                    },
                    {
                      key: "score",
                      header: t("score"),
                      render: (s: TaskStudentRow) => s.grade ?? "—",
                    },
                    {
                      key: "attempts",
                      header: t("attempts"),
                      render: (s: TaskStudentRow) => s.attempts || "—",
                    },
                    {
                      key: "file",
                      header: t("file"),
                      render: (s: TaskStudentRow) =>
                        s.fileUrl ? (
                          <a
                            href={s.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-600 hover:underline dark:text-indigo-400"
                          >
                            {t("viewSolution")}
                          </a>
                        ) : (
                          "—"
                        ),
                    },
                    {
                      key: "actions",
                      header: t("actions"),
                      render: (s: TaskStudentRow) => {
                        if (s.resultSentAt) {
                          return (
                            <span className="text-green-600">
                              {t("resultSent")}
                            </span>
                          );
                        }
                        if (s.status === "graded" && s.submissionId) {
                          const pendingWa = !!pendingWaIds[s.submissionId];
                          return (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={
                                !pendingWa && !!sendingIds[s.submissionId]
                              }
                              onClick={() => handleSendResult(s)}
                            >
                              {pendingWa ? t("confirmSent") : t("sendResult")}
                            </Button>
                          );
                        }
                        return "—";
                      },
                    },
                  ]}
                  rows={detail.students}
                  keyExtractor={(s) => s.studentId}
                  emptyText={t("noSubmissions")}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
