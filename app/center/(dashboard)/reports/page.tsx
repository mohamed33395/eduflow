"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/app/hooks/useAuth";
import { getTasks, getTask } from "@/app/services/tasks";
import { getAttendance } from "@/app/services/attendance";
import { StatsCard } from "@/app/components/ui/StatsCard";
import { DonutChart, BarChart } from "@/app/components/ui/charts";
import { useI18n } from "@/app/lib/i18n/client";
import {
  ClipboardList,
  TrendingUp,
  CheckCircle2,
  FileCheck,
} from "lucide-react";
import type { AttendanceRecord, CenterTask, TaskDetail } from "@/app/types";

/** Card wrapper matching the dashboard's rounded/bordered style. */
const card =
  "rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800";
const th =
  "pb-3 text-start text-xs font-semibold uppercase tracking-wide text-slate-400";
const td = "py-3 text-sm text-slate-700 dark:text-slate-300";

type Tab = "students" | "teachers";

interface StudentAgg {
  id: string;
  name: string;
  notified: number;
  submitted: number;
  graded: number;
  rejected: number;
  gradeSum: number;
  gradeCount: number;
}

interface TeacherAgg {
  id: string;
  name: string;
  tasks: number;
  notified: number;
  submitted: number;
  graded: number;
  rejected: number;
  pending: number;
  gradeSum: number;
  gradeCount: number;
  /** students whose avg grade ≥ TOP_GRADE */
  topStudents: number;
  /** unique students this teacher graded at least once */
  gradedStudents: number;
  attPresent: number;
  attTotal: number;
}

/** A student counts as "top" when their average grade reaches this. */
const TOP_GRADE = 85;

const avg = (a: { gradeSum: number; gradeCount: number }) =>
  a.gradeCount > 0 ? a.gradeSum / a.gradeCount : null;

export default function CenterReportsPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const centerId = user?.centerId ?? "";

  const [tasks, setTasks] = useState<CenterTask[]>([]);
  const [details, setDetails] = useState<TaskDetail[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("students");

  useEffect(() => {
    if (!centerId) {
      setLoading(false);
      return;
    }
    let alive = true;
    getTasks(centerId)
      .then(async (list) => {
        if (!alive) return;
        setTasks(list);
        // Per-student rows live on the task detail — fetch them all.
        const ds = await Promise.all(
          list.map((x) => getTask(x.id).catch(() => null))
        );
        if (alive) setDetails(ds.filter((d): d is TaskDetail => !!d));
      })
      .catch(() => null)
      .finally(() => alive && setLoading(false));
    getAttendance()
      .then((rs) => alive && setAttendance(rs))
      .catch(() => null);
    return () => {
      alive = false;
    };
  }, [centerId]);

  /** userId → { present, total } attendance buckets. */
  const attByStudent = useMemo(() => {
    const map = new Map<string, { present: number; total: number }>();
    for (const r of attendance) {
      const a = map.get(r.userId) ?? { present: 0, total: 0 };
      a.total++;
      if (r.status === "present" || r.status === "late") a.present++;
      map.set(r.userId, a);
    }
    return map;
  }, [attendance]);

  /** studentId → aggregated task stats across all tasks. */
  const studentsAgg = useMemo(() => {
    const map = new Map<string, StudentAgg>();
    for (const d of details) {
      for (const s of d.students) {
        const a = map.get(s.studentId) ?? {
          id: s.studentId,
          name: s.name || s.studentId,
          notified: 0,
          submitted: 0,
          graded: 0,
          rejected: 0,
          gradeSum: 0,
          gradeCount: 0,
        };
        a.notified++;
        if (s.status !== "pending") a.submitted++;
        if (s.status === "graded") a.graded++;
        if (s.status === "rejected") a.rejected++;
        if (s.grade != null) {
          a.gradeSum += s.grade;
          a.gradeCount++;
        }
        map.set(s.studentId, a);
      }
    }
    return [...map.values()];
  }, [details]);

  /** teacherId → aggregated grading stats across their tasks. */
  const teachersAgg = useMemo(() => {
    interface Acc extends TeacherAgg {
      studentIds: Set<string>;
      perStudent: Map<string, { sum: number; count: number }>;
    }
    const map = new Map<string, Acc>();
    const detailById = new Map(details.map((d) => [d.id, d]));
    for (const tk of tasks) {
      const a = map.get(tk.teacherId) ?? {
        id: tk.teacherId,
        name: tk.teacherName || "—",
        tasks: 0,
        notified: 0,
        submitted: 0,
        graded: 0,
        rejected: 0,
        pending: 0,
        gradeSum: 0,
        gradeCount: 0,
        topStudents: 0,
        gradedStudents: 0,
        attPresent: 0,
        attTotal: 0,
        studentIds: new Set<string>(),
        perStudent: new Map<string, { sum: number; count: number }>(),
      };
      a.tasks++;
      a.notified += tk.stats.notified;
      // handed-in = submitted (awaiting review) + graded + rejected
      a.submitted += tk.stats.submitted + tk.stats.graded + tk.stats.rejected;
      a.graded += tk.stats.graded;
      a.rejected += tk.stats.rejected;
      a.pending += tk.stats.pending;
      for (const s of detailById.get(tk.id)?.students ?? []) {
        a.studentIds.add(s.studentId);
        if (s.grade != null) {
          a.gradeSum += s.grade;
          a.gradeCount++;
          const g = a.perStudent.get(s.studentId) ?? { sum: 0, count: 0 };
          g.sum += s.grade;
          g.count++;
          a.perStudent.set(s.studentId, g);
        }
      }
      map.set(tk.teacherId, a);
    }
    // derived: top performers (avg ≥ TOP_GRADE) + attendance over their students
    return [...map.values()].map((a) => {
      let top = 0;
      for (const g of a.perStudent.values()) {
        if (g.count > 0 && g.sum / g.count >= TOP_GRADE) top++;
      }
      let attPresent = 0;
      let attTotal = 0;
      for (const sid of a.studentIds) {
        const r = attByStudent.get(sid);
        if (r) {
          attPresent += r.present;
          attTotal += r.total;
        }
      }
      return {
        id: a.id,
        name: a.name,
        tasks: a.tasks,
        notified: a.notified,
        submitted: a.submitted,
        graded: a.graded,
        rejected: a.rejected,
        pending: a.pending,
        gradeSum: a.gradeSum,
        gradeCount: a.gradeCount,
        topStudents: top,
        gradedStudents: a.perStudent.size,
        attPresent,
        attTotal,
      };
    });
  }, [tasks, details, attByStudent]);

  /** Global submission-status distribution for the donut. */
  const statusTotals = useMemo(() => {
    const tot = { pending: 0, submitted: 0, graded: 0, rejected: 0 };
    for (const tk of tasks) {
      tot.pending += tk.stats.pending;
      tot.submitted += tk.stats.submitted;
      tot.graded += tk.stats.graded;
      tot.rejected += tk.stats.rejected;
    }
    return tot;
  }, [tasks]);

  const totals = useMemo(() => {
    const notified = tasks.reduce((s, x) => s + x.stats.notified, 0);
    const submitted =
      statusTotals.submitted + statusTotals.graded + statusTotals.rejected;
    const gradedRows = studentsAgg.reduce(
      (s, x) => ({ sum: s.sum + x.gradeSum, count: s.count + x.gradeCount }),
      { sum: 0, count: 0 }
    );
    return {
      notified,
      submitted,
      reviewed: statusTotals.graded + statusTotals.rejected,
      avgGrade: gradedRows.count > 0 ? gradedRows.sum / gradedRows.count : null,
    };
  }, [tasks, statusTotals, studentsAgg]);

  const submissionRate =
    totals.notified > 0
      ? Math.round((totals.submitted / totals.notified) * 100)
      : 0;
  const gradingRate =
    totals.submitted > 0
      ? Math.round((totals.reviewed / totals.submitted) * 100)
      : 0;

  const fmtGrade = (g: number | null) => (g == null ? "—" : g.toFixed(1));

  /** Mini progress bar used inside table cells. */
  const RateBar = ({ pct, color = "bg-teal-600" }: { pct: number; color?: string }) => (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
      <span className="w-9 text-end text-xs text-slate-400">{pct}%</span>
    </div>
  );

  const pct = (part: number, whole: number) =>
    whole > 0 ? Math.round((part / whole) * 100) : 0;

  const topStudents = useMemo(
    () =>
      studentsAgg
        .filter((s) => s.gradeCount > 0)
        .sort((a, b) => avg(b)! - avg(a)!)
        .slice(0, 8),
    [studentsAgg]
  );

  if (loading) {
    return <p className="p-6 text-slate-500">{t("loading")}</p>;
  }

  return (
    <div className="space-y-6">
      {/* ── header ── */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t("reports")}
        </h1>
        <p className="mt-1 text-sm text-slate-500">{t("reportsSubtitle")}</p>
      </div>

      {/* ── global KPIs ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title={t("tasks")}
          value={tasks.length}
          icon={<ClipboardList size={22} />}
          trend={`${totals.notified} ${t("notified")}`}
          trendUp
        />
        <StatsCard
          title={t("submissionRate")}
          value={`${submissionRate}%`}
          icon={<TrendingUp size={22} />}
          trend={`${totals.submitted}/${totals.notified}`}
          trendUp
        />
        <StatsCard
          title={t("avgGrade")}
          value={fmtGrade(totals.avgGrade)}
          icon={<FileCheck size={22} />}
          trend={`${studentsAgg.reduce((s, x) => s + x.gradeCount, 0)} ${t("graded")}`}
          trendUp
        />
        <StatsCard
          title={t("gradingRate")}
          value={`${gradingRate}%`}
          icon={<CheckCircle2 size={22} />}
          trend={`${totals.reviewed}/${totals.submitted}`}
          trendUp={gradingRate >= 50}
        />
      </div>

      {/* ── report tabs ── */}
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
            {k === "students" ? t("studentReport") : t("teacherReport")}
          </button>
        ))}
      </div>

      {tasks.length === 0 && (
        <p className={`${card} text-sm text-slate-500`}>{t("noTaskData")}</p>
      )}

      {/* ════════════ students report ════════════ */}
      {tab === "students" && tasks.length > 0 && (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            <section className={card}>
              <h3 className="mb-1 text-lg font-semibold text-slate-900 dark:text-white">
                {t("statusDistribution")}
              </h3>
              <p className="mb-4 text-xs text-slate-400">
                {totals.notified} {t("notified")}
              </p>
              <DonutChart
                data={[
                  { label: t("graded"), value: statusTotals.graded, color: "#0f766e" },
                  { label: t("submitted"), value: statusTotals.submitted, color: "#6366f1" },
                  { label: t("pending"), value: statusTotals.pending, color: "#d9a441" },
                  { label: t("rejected"), value: statusTotals.rejected, color: "#dc2626" },
                ]}
                centerValue={totals.submitted}
                centerLabel={t("submitted")}
                size={150}
              />
            </section>

            <section className={`${card} lg:col-span-2`}>
              <h3 className="mb-1 text-lg font-semibold text-slate-900 dark:text-white">
                {t("avgGradePerStudent")}
              </h3>
              <p className="mb-4 text-xs text-slate-400">
                {topStudents.length} {t("students")}
              </p>
              <BarChart
                data={topStudents.map((s) => ({
                  label: s.name,
                  value: Math.round(avg(s)! * 10) / 10,
                }))}
                formatValue={(v) => v.toFixed(1)}
              />
            </section>
          </div>

          <section className={card}>
            <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
              {t("studentReport")}
            </h3>
            {studentsAgg.length === 0 ? (
              <p className="text-sm text-slate-500">{t("noTaskData")}</p>
            ) : (
              <div className="-mx-2 overflow-x-auto">
                <table className="w-full min-w-[34rem] border-collapse px-2">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700">
                      <th className={th}>{t("name")}</th>
                      <th className={th}>{t("notified")}</th>
                      <th className={th}>{t("submitted")}</th>
                      <th className={th}>{t("graded")}</th>
                      <th className={`${th} w-36`}>{t("submissionRate")}</th>
                      <th className={`${th} w-36`}>{t("attendance")}</th>
                      <th className={`${th} text-end`}>{t("avgGrade")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...studentsAgg]
                      .sort((a, b) => (avg(b) ?? -1) - (avg(a) ?? -1))
                      .map((s) => {
                        const att = attByStudent.get(s.id);
                        return (
                          <tr
                            key={s.id}
                            className="border-b border-slate-50 last:border-0 dark:border-slate-800"
                          >
                            <td className={`${td} font-medium`}>{s.name}</td>
                            <td className={td}>{s.notified}</td>
                            <td className={td}>{s.submitted}</td>
                            <td className={td}>
                              {s.graded}
                              {s.rejected > 0 && (
                                <span className="ms-1 text-xs text-rose-500">
                                  (+{s.rejected} {t("rejected")})
                                </span>
                              )}
                            </td>
                            <td className={td}>
                              <RateBar pct={pct(s.submitted, s.notified)} />
                            </td>
                            <td className={td}>
                              {att && att.total > 0 ? (
                                <RateBar
                                  pct={pct(att.present, att.total)}
                                  color="bg-emerald-500"
                                />
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className={`${td} text-end font-semibold`}>
                              {fmtGrade(avg(s))}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {/* ════════════ teachers report ════════════ */}
      {tab === "teachers" && tasks.length > 0 && (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            <section className={card}>
              <h3 className="mb-1 text-lg font-semibold text-slate-900 dark:text-white">
                {t("gradedPerTeacher")}
              </h3>
              <p className="mb-4 text-xs text-slate-400">
                {teachersAgg.length} {t("teachers")}
              </p>
              <BarChart
                data={teachersAgg.map((x) => ({
                  label: x.name,
                  value: x.graded,
                }))}
              />
            </section>

            <section className={card}>
              <h3 className="mb-1 text-lg font-semibold text-slate-900 dark:text-white">
                {t("topPerformersPct")}
              </h3>
              <p className="mb-4 text-xs text-slate-400">
                {t("avgGrade")} ≥ {TOP_GRADE}
              </p>
              <BarChart
                data={teachersAgg.map((x) => ({
                  label: x.name,
                  value: pct(x.topStudents, x.gradedStudents),
                }))}
                formatValue={(v) => `${v}%`}
              />
            </section>

            <section className={card}>
              <h3 className="mb-1 text-lg font-semibold text-slate-900 dark:text-white">
                {t("attendanceRate")}
              </h3>
              <p className="mb-4 text-xs text-slate-400">
                {t("attendancePerTeacher")}
              </p>
              <BarChart
                data={teachersAgg.map((x) => ({
                  label: x.name,
                  value: pct(x.attPresent, x.attTotal),
                }))}
                formatValue={(v) => `${v}%`}
              />
            </section>
          </div>

          <section className={card}>
            <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">
              {t("teacherReport")}
            </h3>
            {teachersAgg.length === 0 ? (
              <p className="text-sm text-slate-500">{t("noTaskData")}</p>
            ) : (
              <div className="-mx-2 overflow-x-auto">
                <table className="w-full min-w-[36rem] border-collapse px-2">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700">
                      <th className={th}>{t("name")}</th>
                      <th className={th}>{t("tasks")}</th>
                      <th className={th}>{t("submitted")}</th>
                      <th className={th}>{t("pendingReview")}</th>
                      <th className={th}>{t("topPerformers")}</th>
                      <th className={`${th} w-32`}>{t("attendance")}</th>
                      <th className={`${th} w-36`}>{t("gradingRate")}</th>
                      <th className={`${th} text-end`}>{t("avgGrade")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...teachersAgg]
                      .sort(
                        (a, b) =>
                          pct(b.graded + b.rejected, b.submitted) -
                          pct(a.graded + a.rejected, a.submitted)
                      )
                      .map((x) => (
                        <tr
                          key={x.id}
                          className="border-b border-slate-50 last:border-0 dark:border-slate-800"
                        >
                          <td className={`${td} font-medium`}>{x.name}</td>
                          <td className={td}>{x.tasks}</td>
                          <td className={td}>
                            {x.submitted}
                            <span className="ms-1 text-xs text-slate-400">
                              /{x.notified}
                            </span>
                          </td>
                          <td className={td}>
                            <span
                              className={
                                x.submitted - x.graded - x.rejected > 0
                                  ? "font-semibold text-amber-600"
                                  : "text-slate-400"
                              }
                            >
                              {Math.max(
                                0,
                                x.submitted - x.graded - x.rejected
                              )}
                            </span>
                          </td>
                          <td className={td}>
                            <span className="font-semibold text-teal-600">
                              {x.topStudents}
                            </span>
                            <span className="ms-1 text-xs text-slate-400">
                              /{x.gradedStudents} · {pct(x.topStudents, x.gradedStudents)}%
                            </span>
                          </td>
                          <td className={td}>
                            {x.attTotal > 0 ? (
                              <RateBar
                                pct={pct(x.attPresent, x.attTotal)}
                                color="bg-emerald-500"
                              />
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className={td}>
                            <RateBar
                              pct={pct(x.graded + x.rejected, x.submitted)}
                              color="bg-indigo-600"
                            />
                          </td>
                          <td className={`${td} text-end font-semibold`}>
                            {fmtGrade(avg(x))}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
