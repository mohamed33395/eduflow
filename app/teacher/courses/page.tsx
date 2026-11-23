"use client";

import { useEffect, useState } from "react";
import { LibraryBig } from "lucide-react";
import { useAuth } from "@/app/hooks/useAuth";
import { getTeacherById } from "@/app/services/teachers";
import { getCourses } from "@/app/services/courses";
import { getLessons } from "@/app/services/lessons";
import { getAssignments } from "@/app/services/assignments";
import {
  CourseCard,
  CourseCardSkeleton,
  type CourseCardStats,
} from "@/app/components/CourseCard";
import { useI18n } from "@/app/lib/i18n/client";
import type { Course } from "@/app/types";

export default function TeacherCoursesPage() {
  const { t } = useI18n();
  const [courses, setCourses] = useState<Course[]>([]);
  const [stats, setStats] = useState<Record<string, CourseCardStats>>({});
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();

  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    let cancelled = false;

    (async () => {
      const teacher = await getTeacherById(uid);
      const all = await getCourses();
      if (cancelled) return;
      const mine = all.filter((c) => teacher?.assignedCourses.includes(c.id));
      setCourses(mine);
      setLoading(false);

      const entries = await Promise.all(
        mine.map(async (c) => {
          const [lessons, assignments] = await Promise.all([
            getLessons(c.id).catch(() => []),
            getAssignments(c.id).catch(() => []),
          ]);
          return [
            c.id,
            { lessons: lessons.length, assignments: assignments.length },
          ] as const;
        })
      );
      if (!cancelled) setStats(Object.fromEntries(entries));
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t("myCourses")}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {courses.length > 0 ? `${courses.length} ${t("course")}` : null}
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {loading &&
          Array.from({ length: 3 }).map((_, i) => <CourseCardSkeleton key={i} />)}

        {!loading &&
          courses.map((c) => (
            <CourseCard key={c.id} course={c} stats={stats[c.id]} />
          ))}
      </div>

      {!loading && courses.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 py-16 text-center dark:border-slate-700">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
            <LibraryBig className="h-7 w-7 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            {t("noCoursesAssigned")}
          </p>
        </div>
      )}
    </div>
  );
}
