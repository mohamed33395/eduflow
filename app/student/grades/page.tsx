"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  GraduationCap,
  Send,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/app/hooks/useAuth";
import { getStudentById } from "@/app/services/students";
import { getAssignments, getSubmissions } from "@/app/services/assignments";
import { getCourses } from "@/app/services/courses";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Progress } from "@/app/components/ui/progress";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import { useI18n } from "@/app/lib/i18n/client";
import { cn } from "@/app/lib/utils";
import {
  buildCertificateHtml,
  buildParentMessage,
  buildResultHtml,
  downloadHtml,
  printHtml,
  ratingKey,
  type GradeRow,
} from "@/app/lib/grade-report";
import type { Student } from "@/app/types";

function pctStyle(pct: number) {
  if (pct >= 85)
    return {
      text: "text-emerald-600 dark:text-emerald-400",
      bar: "[&>div]:bg-emerald-500",
    };
  if (pct >= 50)
    return {
      text: "text-amber-600 dark:text-amber-400",
      bar: "[&>div]:bg-amber-500",
    };
  return {
    text: "text-rose-600 dark:text-rose-400",
    bar: "[&>div]:bg-rose-500",
  };
}

export default function StudentGradesPage() {
  const { t, locale, dir } = useI18n();
  const intl = locale === "ar" ? "ar-EG" : "en-US";
  const { user } = useAuth();

  const [rows, setRows] = useState<GradeRow[]>([]);
  const [courseNames, setCourseNames] = useState<Record<string, string>>({});
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("");

  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    let cancelled = false;

    (async () => {
      const [st, courseList] = await Promise.all([
        getStudentById(uid),
        getCourses().catch(() => []),
      ]);
      if (cancelled || !st) {
        if (!cancelled) setLoading(false);
        return;
      }

      const names = Object.fromEntries(courseList.map((c) => [c.id, c.name]));
      const assignments = (
        await Promise.all(
          st.courses.map((cid) => getAssignments(cid).catch(() => []))
        )
      ).flat();
      const submissions = (
        await Promise.all(
          assignments.map((a) => getSubmissions(a.id).catch(() => []))
        )
      ).flat();

      const byAssignment = new Map(assignments.map((a) => [a.id, a]));
      const built: GradeRow[] = submissions
        .filter((s) => s.studentId === uid)
        .map((s) => {
          const assignment = byAssignment.get(s.assignmentId);
          if (!assignment) return null;
          const max = assignment.maxGrade ?? 100;
          const pct =
            s.grade !== undefined ? Math.round((s.grade / max) * 100) : null;
          const month = new Intl.DateTimeFormat(intl, {
            month: "long",
            year: "numeric",
          }).format(new Date(assignment.deadline || s.submittedAt));
          return { sub: s, assignment, month, pct };
        })
        .filter((r): r is GradeRow => r !== null)
        .sort(
          (a, b) =>
            new Date(b.assignment.deadline || b.sub.submittedAt).getTime() -
            new Date(a.assignment.deadline || a.sub.submittedAt).getTime()
        );

      if (!cancelled) {
        setRows(built);
        setCourseNames(names);
        setStudent(st);
        const firstCourse = built[0]?.assignment.courseId;
        if (firstCourse) setActiveTab(firstCourse);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.uid, intl]);

  // subjects → rows (sorted desc by date, so month insertion order is desc)
  const groups = useMemo(() => {
    const map = new Map<string, GradeRow[]>();
    for (const r of rows) {
      const arr = map.get(r.assignment.courseId) ?? [];
      arr.push(r);
      map.set(r.assignment.courseId, arr);
    }
    return [...map.entries()]
      .map(([courseId, list]) => {
        // group by month, preserving desc order
        const months = new Map<string, GradeRow[]>();
        for (const r of list) {
          const arr = months.get(r.month) ?? [];
          arr.push(r);
          months.set(r.month, arr);
        }
        const graded = list.filter((r) => r.pct !== null);
        const avg = graded.length
          ? Math.round(
              graded.reduce((a, r) => a + (r.pct ?? 0), 0) / graded.length
            )
          : null;
        return {
          courseId,
          list,
          months: [...months.entries()],
          avg,
          period: [...months.keys()].reverse().join("، "),
        };
      })
      .sort((a, b) =>
        (courseNames[a.courseId] || "").localeCompare(
          courseNames[b.courseId] || "",
          locale
        )
      );
  }, [rows, courseNames, locale]);

  const stats = useMemo(() => {
    const graded = rows.filter((r) => r.pct !== null);
    const avg = graded.length
      ? Math.round(graded.reduce((a, r) => a + (r.pct ?? 0), 0) / graded.length)
      : null;
    return {
      total: rows.length,
      graded: graded.length,
      pending: rows.length - graded.length,
      avg,
    };
  }, [rows]);

  const studentName = student?.name || user?.name || "";
  const ratingBadge = (avg: number | null) => {
    const key = ratingKey(avg);
    const variant =
      avg === null
        ? "neutral"
        : avg >= 90
          ? "success"
          : avg >= 75
            ? "info"
            : avg >= 50
              ? "warning"
              : "danger";
    return (
      <Badge variant={variant} className="px-3 py-1 text-sm">
        {t("rating")}: {t(key)}
        {avg !== null && ` (${avg}%)`}
      </Badge>
    );
  };

  const handleDownload = (g: (typeof groups)[number]) => {
    const subjectName = courseNames[g.courseId] || t("subject");
    const html = buildResultHtml({
      dir,
      lang: locale,
      studentName,
      subjectName,
      rows: g.list,
      avg: g.avg,
      ratingLabel: t(ratingKey(g.avg)),
      labels: {
        reportCard: t("reportCard"),
        studentName: t("studentName"),
        subject: t("subject"),
        exam: t("exam"),
        examResults: t("examResults"),
        grade: t("grade"),
        feedback: t("feedback"),
        notGraded: t("notGraded"),
        overallRating: t("overallRating"),
        month: t("month"),
      },
    });
    downloadHtml(`${subjectName}-${t("reportCard")}.html`, html);
  };

  const handleCertificate = (g: (typeof groups)[number]) => {
    const subjectName = courseNames[g.courseId] || t("subject");
    const html = buildCertificateHtml({
      dir,
      lang: locale,
      studentName,
      subjectName,
      period: g.period || t("exam"),
      ratingLabel: t(ratingKey(g.avg)),
      labels: {
        certificateOfAppreciation: t("certificateOfAppreciation"),
        certificateText: t("certificateText"),
        certificateSigner: t("certificateSigner"),
        date: t("date"),
      },
    });
    printHtml(html);
  };

  const handleSendParents = (g: (typeof groups)[number]) => {
    const phone = (student?.parentPhone || "").replace(/\D/g, "");
    if (!phone) {
      alert(t("noParentPhone"));
      return;
    }
    const subjectName = courseNames[g.courseId] || t("subject");
    const msg = buildParentMessage({
      locale,
      studentName,
      subjectName,
      avg: g.avg,
      ratingLabel: t(ratingKey(g.avg)),
      rows: g.list,
      labels: {
        reportCard: t("reportCard"),
        overallRating: t("overallRating"),
        notGraded: t("notGraded"),
      },
    });
    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`,
      "_blank"
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        {t("grades")}
      </h1>

      {loading ? (
        <div className="space-y-3">
          <div className="h-24 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
          <div className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 py-16 text-slate-400 dark:border-slate-700">
          <GraduationCap className="h-10 w-10" />
          <p className="text-sm font-medium">{t("noGradesYet")}</p>
        </div>
      ) : (
        <>
          {/* summary stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat
              icon={<BookOpen className="h-4 w-4 text-sky-500" />}
              label={t("exams")}
              value={stats.total}
            />
            <Stat
              icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
              label={t("graded")}
              value={stats.graded}
            />
            <Stat
              icon={<Clock3 className="h-4 w-4 text-amber-500" />}
              label={t("notGraded")}
              value={stats.pending}
            />
            <Stat
              icon={<TrendingUp className="h-4 w-4 text-violet-500" />}
              label={t("average")}
              value={stats.avg !== null ? `${stats.avg}%` : "—"}
            />
          </div>

          {/* subject tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-transparent p-0">
              {groups.map((g) => (
                <TabsTrigger
                  key={g.courseId}
                  value={g.courseId}
                  className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  {courseNames[g.courseId] || t("subject")}
                  <span className="ms-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs data-[state=active]:bg-white/25 dark:bg-slate-800">
                    {g.list.length}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>

            {groups.map((g) => {
              const subjectName = courseNames[g.courseId] || t("subject");
              const hasGraded = g.list.some((r) => r.pct !== null);
              return (
                <TabsContent key={g.courseId} value={g.courseId}>
                  {/* subject header */}
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <BookOpen className="h-5 w-5" />
                      </span>
                      <div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                          {subjectName}
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {g.list.length} {t("exams")}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {ratingBadge(g.avg)}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(g)}
                      >
                        <Download className="h-4 w-4" />
                        {t("downloadResult")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCertificate(g)}
                        disabled={!hasGraded}
                        title={!hasGraded ? t("notGraded") : undefined}
                      >
                        <Award className="h-4 w-4" />
                        {t("certificate")}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSendParents(g)}
                      >
                        <Send className="h-4 w-4" />
                        {t("sendToParents")}
                      </Button>
                    </div>
                  </div>

                  {/* months */}
                  <div className="space-y-4">
                    {g.months.map(([month, list]) => (
                      <section
                        key={month}
                        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
                      >
                        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-800/40">
                          <CalendarDays className="h-4 w-4 text-primary" />
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            {month}
                          </h3>
                          <span className="ms-auto text-xs text-slate-400">
                            {list.length} {t("exams")}
                          </span>
                        </div>
                        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                          {list.map(({ sub, assignment, pct }) => {
                            const max = assignment.maxGrade ?? 100;
                            const isGraded = pct !== null;
                            const style = isGraded ? pctStyle(pct) : null;
                            return (
                              <li
                                key={sub.id}
                                className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                    {assignment.title}
                                  </p>
                                  {sub.feedback ? (
                                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                      {sub.feedback}
                                    </p>
                                  ) : null}
                                </div>
                                <div className="w-full sm:w-40">
                                  {isGraded ? (
                                    <Progress
                                      value={pct}
                                      className={cn("h-2", style?.bar)}
                                    />
                                  ) : (
                                    <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800" />
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  <span
                                    className={cn(
                                      "w-16 text-end text-sm font-bold tabular-nums",
                                      style?.text ?? "text-slate-400"
                                    )}
                                  >
                                    {isGraded
                                      ? `${sub.grade} / ${max}`
                                      : "—"}
                                  </span>
                                  <Badge
                                    variant={isGraded ? "success" : "neutral"}
                                  >
                                    {isGraded
                                      ? t("graded")
                                      : t("notGraded")}
                                  </Badge>
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </section>
                    ))}
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        </>
      )}
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800">
        {icon}
      </div>
      <div>
        <div className="text-lg font-bold leading-5 text-slate-900 dark:text-white">
          {value}
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      </div>
    </div>
  );
}
