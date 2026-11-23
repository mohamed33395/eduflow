"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/app/hooks/useAuth";
import { getStudents } from "@/app/services/students";
import { getPayments, createPayment, recordPayment } from "@/app/services/payments";
import { getTeachers } from "@/app/services/teachers";
import { getSubjects } from "@/app/services/subjects";
import { getCourses } from "@/app/services/courses";
import {
  getPayouts,
  generatePayout,
  previewPayout,
  updatePayoutStatus,
} from "@/app/services/payouts";
import { Table } from "@/app/components/ui/table";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { StatusBadge } from "@/app/components/ui/status-badge";
import { formatCurrency } from "@/app/lib/utils";
import { useI18n } from "@/app/lib/i18n/client";
import type {
  Course,
  EducationLevel,
  Payment,
  Student,
  Subject,
  Teacher,
  TeacherPayout,
} from "@/app/types";

type Tab = "students" | "teachers";

const selectCls =
  "rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800";

export default function CenterPaymentsPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const centerId = user?.centerId ?? "";

  const [tab, setTab] = useState<Tab>("students");
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [payouts, setPayouts] = useState<TeacherPayout[]>([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  // filters
  const [yearFilter, setYearFilter] = useState(""); // "level|grade" or ""
  const [subjectFilter, setSubjectFilter] = useState(""); // subjectId or ""

  const [showPayForm, setShowPayForm] = useState(false);
  const [payForm, setPayForm] = useState({
    studentId: "",
    courseId: "",
    amount: 0,
    paid: 0,
    dueDate: "",
  });

  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [payoutForm, setPayoutForm] = useState({
    teacherId: "",
    notes: "",
  });
  const prevMonthStr = () => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };
  const [month, setMonth] = useState(prevMonthStr);
  const [previewResult, setPreviewResult] = useState<{
    key: string;
    payout: TeacherPayout | null;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const loadData = useCallback(() => {
    if (!centerId) return;
    getStudents(centerId).then(setStudents).catch(() => null);
    getPayments().then(setPayments).catch(() => null);
    getTeachers(centerId).then(setTeachers).catch(() => null);
    getSubjects({ centerId }).then(setSubjects).catch(() => null);
    getCourses(centerId).then(setCourses).catch(() => null);
    getPayouts().then(setPayouts).catch(() => null);
  }, [centerId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── students tab: year options from actual students ──────────────
  const yearOptions = useMemo(() => {
    const seen = new Map<string, { level: EducationLevel; grade: number }>();
    for (const s of students) {
      if (s.level && s.grade !== undefined) {
        seen.set(`${s.level}|${s.grade}`, { level: s.level, grade: s.grade });
      }
    }
    return [...seen.entries()]
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => a.level.localeCompare(b.level) || a.grade - b.grade);
  }, [students]);

  const studentById = useMemo(
    () => new Map(students.map((s) => [s.id, s])),
    [students]
  );

  const matchesYear = useCallback(
    (level?: EducationLevel, grade?: number) => {
      if (!yearFilter) return true;
      const [lv, gr] = yearFilter.split("|");
      return level === lv && grade === Number(gr);
    },
    [yearFilter]
  );

  const filteredStudents = useMemo(
    () => students.filter((s) => matchesYear(s.level, s.grade)),
    [students, matchesYear]
  );

  const filteredPayments = useMemo(() => {
    const studentIds = new Set(students.map((s) => s.id));
    return payments.filter((p) => {
      if (!studentIds.has(p.studentId)) return false;
      const lv = p.studentLevel ?? studentById.get(p.studentId)?.level;
      const gr = p.studentGrade ?? studentById.get(p.studentId)?.grade;
      return matchesYear(lv, gr);
    });
  }, [payments, students, studentById, matchesYear]);

  // ── teachers tab: subject filter ─────────────────────────────────
  const teacherMatchesSubject = useCallback(
    (teacher: Teacher) => {
      if (!subjectFilter) return true;
      if (teacher.assignedSubjectIds?.includes(subjectFilter)) return true;
      return subjects.some(
        (s) => s.id === subjectFilter && s.teacherId === teacher.id
      );
    },
    [subjectFilter, subjects]
  );

  const filteredTeachers = useMemo(
    () => teachers.filter(teacherMatchesSubject),
    [teachers, teacherMatchesSubject]
  );

  const filteredPayouts = useMemo(() => {
    const ids = new Set(filteredTeachers.map((x) => x.id));
    return payouts.filter((p) => ids.has(p.teacherId));
  }, [payouts, filteredTeachers]);

  const monthRange = useCallback((m: string) => {
    const [y, mo] = m.split("-").map(Number);
    const last = new Date(y, mo, 0).getDate();
    return {
      start: `${m}-01`,
      end: `${m}-${String(last).padStart(2, "0")}`,
    };
  }, []);

  // live preview of the computed salary for the selected teacher+month.
  // The fetched value is keyed by its inputs; a stale preview is masked in
  // render instead of synchronously resetting state inside this effect.
  useEffect(() => {
    if (!payoutForm.teacherId || !month) return;
    const key = `${payoutForm.teacherId}:${month}`;
    const { start, end } = monthRange(month);
    previewPayout({
      teacherId: payoutForm.teacherId,
      periodStart: start,
      periodEnd: end,
    })
      .then((payout) => setPreviewResult({ key, payout }))
      .catch(() => setPreviewResult({ key, payout: null }));
  }, [payoutForm.teacherId, month, monthRange]);

  const preview =
    previewResult?.key === `${payoutForm.teacherId}:${month}`
      ? previewResult.payout
      : null;

  const teacherSubjects = useCallback(
    (teacher: Teacher): string => {
      const ids = new Set(teacher.assignedSubjectIds ?? []);
      subjects.forEach((s) => {
        if (s.teacherId === teacher.id) ids.add(s.id);
      });
      return subjects
        .filter((s) => ids.has(s.id))
        .map((s) => s.name)
        .join(", ");
    },
    [subjects]
  );

  // ── actions ──────────────────────────────────────────────────────
  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await createPayment(payForm);
      setShowPayForm(false);
      setPayForm({ studentId: "", courseId: "", amount: 0, paid: 0, dueDate: "" });
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const handlePay = async (id: string) => {
    const amount = Number(prompt(t("enterPaymentAmount")));
    if (!amount) return;
    await recordPayment(id, amount).catch(() => null);
    loadData();
  };

  const handleGeneratePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    const { start, end } = monthRange(month);
    setBusy(true);
    setError("");
    try {
      await generatePayout({
        teacherId: payoutForm.teacherId,
        periodStart: start,
        periodEnd: end,
        notes: payoutForm.notes || undefined,
      });
      setShowPayoutForm(false);
      setPayoutForm({ teacherId: "", notes: "" });
      setPreviewResult(null);
      setNotice(t("payoutCreated"));
      setTimeout(() => setNotice(""), 4000);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  /** Generate the monthly payout for every (filtered) teacher. */
  const handleGenerateAll = async () => {
    const { start, end } = monthRange(month);
    setBusy(true);
    setError("");
    let created = 0;
    let skipped = 0;
    for (const tc of filteredTeachers) {
      try {
        await generatePayout({
          teacherId: tc.id,
          periodStart: start,
          periodEnd: end,
        });
        created++;
      } catch {
        skipped++;
      }
    }
    setBusy(false);
    setNotice(
      `${created} ${t("generatedCount")} · ${skipped} ${t("skippedExists")}`
    );
    setTimeout(() => setNotice(""), 5000);
    loadData();
  };

  const advancePayout = async (p: TeacherPayout) => {
    const next = p.status === "pending" ? "approved" : "paid";
    setBusy(true);
    try {
      await updatePayoutStatus(p.id, next);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const fmtDate = (iso?: string) => (iso ? iso.slice(0, 10) : "—");

  // ── chart data ──────────────────────────────────────────────────
  const yearChart = useMemo(() => {
    const map = new Map<
      string,
      { label: string; paid: number; remaining: number }
    >();
    for (const p of filteredPayments) {
      const lv = p.studentLevel ?? studentById.get(p.studentId)?.level;
      const gr = p.studentGrade ?? studentById.get(p.studentId)?.grade;
      const key = lv && gr !== undefined ? `${t(lv)} ${gr}` : "—";
      const e = map.get(key) ?? { label: key, paid: 0, remaining: 0 };
      e.paid += p.paid;
      e.remaining += p.remaining;
      map.set(key, e);
    }
    return [...map.values()];
  }, [filteredPayments, studentById, t]);

  const payoutChart = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of filteredPayouts) {
      const name =
        p.teacherName ??
        teachers.find((x) => x.id === p.teacherId)?.name ??
        "—";
      map.set(name, (map.get(name) ?? 0) + p.dueAmount);
    }
    return [...map.entries()].map(([label, value]) => ({ label, value }));
  }, [filteredPayouts, teachers]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        {t("payments")}
      </h1>

      {/* tabs */}
      <div className="flex gap-2 border-b border-border">
        {(["students", "teachers"] as Tab[]).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === k
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {k === "students" ? t("studentPayments") : t("teacherPayments")}
          </button>
        ))}
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

      {tab === "students" && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className={selectCls}
            >
              <option value="">{t("allYears")}</option>
              {yearOptions.map((y) => (
                <option key={y.key} value={y.key}>
                  {t(y.level)} — {t("year")} {y.grade}
                </option>
              ))}
            </select>
            <Button onClick={() => setShowPayForm(!showPayForm)}>
              {showPayForm ? t("cancel") : t("addPayment")}
            </Button>
          </div>

          {showPayForm && (
            <form
              onSubmit={handleAddPayment}
              className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <select
                  value={payForm.studentId}
                  onChange={(e) =>
                    setPayForm({ ...payForm, studentId: e.target.value })
                  }
                  className={selectCls}
                  required
                >
                  <option value="">{t("selectStudent")}</option>
                  {filteredStudents.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <select
                  value={payForm.courseId}
                  onChange={(e) =>
                    setPayForm({ ...payForm, courseId: e.target.value })
                  }
                  className={selectCls}
                  required
                >
                  <option value="">{t("selectCourse")}</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <Input
                  label={t("amount")}
                  type="number"
                  value={payForm.amount}
                  onChange={(e) =>
                    setPayForm({ ...payForm, amount: Number(e.target.value) })
                  }
                  required
                />
                <Input
                  label={t("initialPaid")}
                  type="number"
                  value={payForm.paid}
                  onChange={(e) =>
                    setPayForm({ ...payForm, paid: Number(e.target.value) })
                  }
                />
                <Input
                  label={t("dueDate")}
                  type="date"
                  value={payForm.dueDate}
                  onChange={(e) =>
                    setPayForm({ ...payForm, dueDate: e.target.value })
                  }
                />
              </div>
              <Button type="submit" disabled={busy}>
                {t("createPayment")}
              </Button>
            </form>
          )}

          <Table
            columns={[
              {
                key: "studentId",
                header: t("student"),
                render: (row: Payment) =>
                  row.studentName ??
                  studentById.get(row.studentId)?.name ??
                  "—",
              },
              {
                key: "year",
                header: t("year"),
                render: (row: Payment) => {
                  const lv =
                    row.studentLevel ?? studentById.get(row.studentId)?.level;
                  const gr =
                    row.studentGrade ?? studentById.get(row.studentId)?.grade;
                  return lv && gr !== undefined ? `${t(lv)} ${gr}` : "—";
                },
              },
              {
                key: "courseId",
                header: t("course"),
                render: (row: Payment) =>
                  row.courseName ??
                  courses.find((c) => c.id === row.courseId)?.name ??
                  "—",
              },
              {
                key: "amount",
                header: t("amount"),
                render: (row: Payment) => formatCurrency(row.amount),
              },
              {
                key: "paid",
                header: t("paid"),
                render: (row: Payment) => formatCurrency(row.paid),
              },
              {
                key: "remaining",
                header: t("remaining"),
                render: (row: Payment) => formatCurrency(row.remaining),
              },
              {
                key: "actions",
                header: t("actions"),
                render: (row: Payment) => (
                  <Button size="sm" onClick={() => handlePay(row.id)}>
                    {t("recordPayment")}
                  </Button>
                ),
              },
            ]}
            rows={filteredPayments}
            keyExtractor={(row) => row.id}
          />

          {yearChart.length > 0 && (
            <HBarChart
              title={t("paymentsByYear")}
              rows={yearChart.map((y) => ({
                label: y.label,
                total: y.paid + y.remaining,
                parts: [
                  { value: y.paid, cls: "bg-emerald-500" },
                  { value: y.remaining, cls: "bg-amber-400" },
                ],
              }))}
              legend={[
                { cls: "bg-emerald-500", label: t("paid") },
                { cls: "bg-amber-400", label: t("remaining") },
              ]}
            />
          )}
        </section>
      )}

      {tab === "teachers" && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <select
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className={selectCls}
            >
              <option value="">{t("allSubjects")}</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <Button onClick={() => setShowPayoutForm(!showPayoutForm)}>
              {showPayoutForm ? t("cancel") : t("generatePayout")}
            </Button>
          </div>

          {showPayoutForm && (
            <form
              onSubmit={handleGeneratePayout}
              className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label={t("month")}
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  required
                />
                <select
                  value={payoutForm.teacherId}
                  onChange={(e) =>
                    setPayoutForm({ ...payoutForm, teacherId: e.target.value })
                  }
                  className={selectCls}
                  required
                >
                  <option value="">{t("selectTeacher")}</option>
                  {filteredTeachers.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
                <Input
                  label={t("notes")}
                  value={payoutForm.notes}
                  onChange={(e) =>
                    setPayoutForm({ ...payoutForm, notes: e.target.value })
                  }
                />
              </div>

              {preview && (
                <div className="flex flex-wrap gap-6 rounded-lg bg-slate-50 px-4 py-3 text-sm dark:bg-slate-800">
                  <span>
                    {t("compensation")}:{" "}
                    <strong>
                      {preview.compensationType === "percentage"
                        ? `${preview.commissionPercent ?? 0}% ${t("ofCollectedRevenue")}`
                        : `${t("fixed")} ${formatCurrency(preview.fixedAmount ?? 0)}`}
                    </strong>
                  </span>
                  <span>
                    {t("collectedRevenue")}:{" "}
                    <strong>{formatCurrency(preview.collectedRevenue)}</strong>
                  </span>
                  <span>
                    {t("dueAmount")}:{" "}
                    <strong className="text-indigo-600">
                      {formatCurrency(preview.dueAmount)}
                    </strong>
                  </span>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={busy || !payoutForm.teacherId}>
                  {t("generatePayout")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy || filteredTeachers.length === 0}
                  onClick={handleGenerateAll}
                >
                  {t("generateAll")} ({filteredTeachers.length})
                </Button>
              </div>
            </form>
          )}

          {/* teachers list */}
          <Table
            columns={[
              { key: "name", header: t("teacher") },
              {
                key: "subjects",
                header: t("subjects"),
                render: (row: Teacher) => teacherSubjects(row) || "—",
              },
              {
                key: "salary",
                header: t("salary"),
                render: (row: Teacher) =>
                  row.compensationType === "percentage"
                    ? `${row.commissionPercent ?? 0}% ${t("ofCollectedRevenue")}`
                    : row.fixedAmount != null
                      ? `${formatCurrency(row.fixedAmount)} ${t("perMonth")}`
                      : "—",
              },
            ]}
            rows={filteredTeachers}
            keyExtractor={(row) => row.id}
          />

          {/* payouts */}
          <Table
            columns={[
              {
                key: "teacherId",
                header: t("teacher"),
                render: (row: TeacherPayout) =>
                  row.teacherName ??
                  teachers.find((x) => x.id === row.teacherId)?.name ??
                  "—",
              },
              {
                key: "period",
                header: t("period"),
                render: (row: TeacherPayout) =>
                  `${fmtDate(row.periodStart)} → ${fmtDate(row.periodEnd)}`,
              },
              {
                key: "compensationType",
                header: t("compensation"),
                render: (row: TeacherPayout) =>
                  row.compensationType === "percentage"
                    ? `${row.commissionPercent ?? 0}%`
                    : `${t("fixed")} ${formatCurrency(row.fixedAmount ?? 0)}`,
              },
              {
                key: "collectedRevenue",
                header: t("collectedRevenue"),
                render: (row: TeacherPayout) =>
                  formatCurrency(row.collectedRevenue),
              },
              {
                key: "dueAmount",
                header: t("dueAmount"),
                render: (row: TeacherPayout) => formatCurrency(row.dueAmount),
              },
              {
                key: "status",
                header: t("status"),
                render: (row: TeacherPayout) => (
                  <StatusBadge status={row.status} label={t(row.status)} />
                ),
              },
              {
                key: "actions",
                header: t("actions"),
                render: (row: TeacherPayout) =>
                  row.status === "paid" ? (
                    <span className="text-sm text-green-600">
                      {t("paid")} · {fmtDate(row.paidAt)}
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => advancePayout(row)}
                    >
                      {row.status === "pending" ? t("approve") : t("markPaid")}
                    </Button>
                  ),
              },
            ]}
            rows={filteredPayouts}
            keyExtractor={(row) => row.id}
          />

          {payoutChart.length > 0 && (
            <HBarChart
              title={t("payoutsByTeacher")}
              rows={payoutChart.map((r) => ({
                label: r.label,
                total: r.value,
                parts: [{ value: r.value, cls: "bg-indigo-500" }],
              }))}
            />
          )}
        </section>
      )}
    </div>
  );
}

// ── tiny CSS stacked-bar chart ─────────────────────────────────────

type ChartPart = { value: number; cls: string };

function HBarChart({
  title,
  rows,
  legend,
}: {
  title: string;
  rows: { label: string; total: number; parts: ChartPart[] }[];
  legend?: { cls: string; label: string }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-3">
            <span className="w-28 truncate text-xs text-muted-foreground">
              {r.label}
            </span>
            <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="flex h-full"
                style={{ width: `${(r.total / max) * 100}%` }}
              >
                {r.parts.map((p, i) => (
                  <div
                    key={i}
                    className={`h-full ${p.cls}`}
                    style={{ width: `${r.total ? (p.value / r.total) * 100 : 0}%` }}
                  />
                ))}
              </div>
            </div>
            <span className="w-24 text-end text-xs font-medium">
              {formatCurrency(r.total)}
            </span>
          </div>
        ))}
      </div>
      {legend && (
        <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
          {legend.map((l) => (
            <span key={l.label} className="flex items-center gap-1.5">
              <span className={`inline-block h-2.5 w-2.5 rounded-sm ${l.cls}`} />
              {l.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
