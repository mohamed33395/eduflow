"use client";

import { useState, useEffect } from "react";
import { use } from "react";
import { useAuth } from "@/app/hooks/useAuth";
import { StatsCard } from "@/app/components/ui/StatsCard";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { useI18n } from "@/app/lib/i18n/client";
import { getInitials } from "@/app/lib/utils";
import type { Course, Lesson, Assignment, Student, Teacher } from "@/app/types";
import {
  BookOpen,
  FileText,
  Users,
  UserCheck,
  Layout,
  ScrollText,
} from "lucide-react";

export default function AdminCourseViewPage({
  params,
}: PageProps<"/admin/courses/[id]/[slug]">) {
  const { slug } = use(params);
  const { user, loading: authLoading } = useAuth();
  const { t } = useI18n();

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [enrolled, setEnrolled] = useState<Student[]>([]);
  const [courseTeachers, setCourseTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading || !user) return;

    let cancelled = false;
    fetch(`/api/admin/courses/${slug}`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load course");
        }
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          setCourse(data.course as Course);
          setLessons(data.lessons as Lesson[]);
          setAssignments(data.assignments as Assignment[]);
          setEnrolled(data.enrolled as Student[]);
          setCourseTeachers((data.teachers as Teacher[]) ?? []);
        }
      })
      .catch((err) => {
        console.error("[AdminCourseViewPage] load error:", err);
        if (!cancelled) setError(t("failedToLoadCourse"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, slug, t]);

  const stats = course
    ? [
        {
          title: t("course"),
          value: course.name,
          icon: <Layout size={22} />,
        },
        {
          title: t("lessons"),
          value: lessons.length,
          icon: <BookOpen size={22} />,
        },
        {
          title: t("assignments"),
          value: assignments.length,
          icon: <FileText size={22} />,
        },
        {
          title: t("students"),
          value: enrolled.length,
          icon: <Users size={22} />,
        },
        {
          title: t("teachers"),
          value: courseTeachers.length,
          icon: <UserCheck size={22} />,
        },
      ]
    : [];

  // Unauthenticated users aren't loading — they hit the not-found branch.
  if (authLoading || (user && loading)) {
    return <p className="text-muted-foreground">{t("loading")}</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600">{error}</p>;
  }

  if (!course) {
    return <p className="text-muted-foreground">{t("courseNotFound")}</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
          <BookOpen size={24} />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{course.name}</h1>
          <p className="text-sm text-muted-foreground">
            {t("manageCourseSubtitle")}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => (
          <StatsCard key={s.title} title={s.title} value={s.value} icon={s.icon} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-600/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
              <BookOpen size={18} />
            </span>
            <CardTitle>{t("lessons")}</CardTitle>
          </CardHeader>
          <CardContent>
            {lessons.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
                {t("noLessonsYet")}
              </p>
            ) : (
              <ul className="space-y-2">
                {lessons.slice(0, 5).map((l) => (
                  <li
                    key={l.id}
                    className="flex items-center gap-2 text-sm text-foreground"
                  >
                    <FileText
                      size={14}
                      className="shrink-0 text-muted-foreground"
                    />
                    <span className="truncate">{l.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
              <FileText size={18} />
            </span>
            <CardTitle>{t("assignments")}</CardTitle>
          </CardHeader>
          <CardContent>
            {assignments.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
                {t("noAssignmentsYet")}
              </p>
            ) : (
              <ul className="space-y-2">
                {assignments.slice(0, 5).map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center gap-2 text-sm text-foreground"
                  >
                    <ScrollText
                      size={14}
                      className="shrink-0 text-muted-foreground"
                    />
                    <span className="truncate">{a.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-600/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
              <Users size={18} />
            </span>
            <CardTitle>{t("enrolledStudents")}</CardTitle>
          </CardHeader>
          <CardContent>
            {enrolled.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
                {t("noStudentsEnrolledYet")}
              </p>
            ) : (
              <ul className="space-y-3">
                {enrolled.slice(0, 10).map((s) => (
                  <li key={s.id} className="flex items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-600/10 text-sm font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
                      {getInitials(s.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {s.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {s.username}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
              <UserCheck size={18} />
            </span>
            <CardTitle>{t("courseTeachers")}</CardTitle>
          </CardHeader>
          <CardContent>
            {courseTeachers.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
                {t("noTeachersYet")}
              </p>
            ) : (
              <ul className="space-y-3">
                {courseTeachers.slice(0, 10).map((teacher) => (
                  <li key={teacher.id} className="flex items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-amber-500/10 text-sm font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
                      {getInitials(teacher.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        {teacher.name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {teacher.email}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-slate-500/10 text-slate-600 dark:bg-slate-400/15 dark:text-slate-300">
            <ScrollText size={18} />
          </span>
          <CardTitle>{t("courseContent")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm text-foreground">
            {course.content || t("noContentYet")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
