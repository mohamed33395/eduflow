"use client";

import { BookOpen, ClipboardList, GraduationCap, Layers } from "lucide-react";
import { Badge } from "@/app/components/ui/badge";
import { useI18n } from "@/app/lib/i18n/client";
import { cn } from "@/app/lib/utils";
import type { Course } from "@/app/types";

export interface CourseCardStats {
  lessons?: number;
  assignments?: number;
}

const GRADIENTS = [
  "from-emerald-500 via-teal-600 to-cyan-700",
  "from-indigo-500 via-violet-600 to-purple-700",
  "from-amber-500 via-orange-600 to-rose-600",
  "from-sky-500 via-blue-600 to-indigo-700",
  "from-rose-500 via-pink-600 to-fuchsia-700",
];

const ICONS = [BookOpen, GraduationCap, Layers];

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

const LEVEL_KEYS = new Set(["kindergarten", "primary", "middle", "high"]);
const TYPE_KEYS = new Set(["group"]);

export function CourseCard({
  course,
  stats,
}: {
  course: Course;
  stats?: CourseCardStats;
}) {
  const { t } = useI18n();
  const h = hashId(course.id);
  const gradient = GRADIENTS[h % GRADIENTS.length];
  const Icon = ICONS[h % ICONS.length];

  const levelLabel = LEVEL_KEYS.has(course.level) ? t(course.level) : course.level;
  const typeLabel = TYPE_KEYS.has(course.type) ? t(course.type) : course.type;
  const gradeLabel =
    course.gradeFrom === course.gradeTo
      ? `${t("grade") || ""} ${course.gradeFrom}`.trim()
      : `${course.gradeFrom} – ${course.gradeTo}`;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-900">
      {/* Cover / banner */}
      <div className={cn("relative h-32 overflow-hidden bg-gradient-to-br", gradient)}>
        {course.coverImage ? (
          <img
            src={course.coverImage}
            alt={course.name}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <>
            {/* decorative circles */}
            <div className="absolute -top-8 -end-8 h-32 w-32 rounded-full bg-white/10" />
            <div className="absolute -bottom-10 -start-10 h-36 w-36 rounded-full bg-black/10" />
            <Icon className="absolute inset-0 m-auto h-12 w-12 text-white/80 drop-shadow-md" />
          </>
        )}
        <Badge
          variant="secondary"
          className="absolute end-3 top-3 border-0 bg-white/90 text-slate-800 shadow-sm backdrop-blur dark:bg-slate-950/80 dark:text-slate-200"
        >
          {typeLabel}
        </Badge>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="line-clamp-1 text-base font-bold leading-6 text-slate-900 dark:text-white">
          {course.name}
        </h3>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="info" className="font-medium">
            <GraduationCap className="h-3 w-3" />
            {levelLabel}
          </Badge>
          <Badge variant="neutral" className="font-medium">
            {gradeLabel}
          </Badge>
        </div>

        {course.description ? (
          <p className="line-clamp-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
            {course.description}
          </p>
        ) : null}

        {/* Footer stats */}
        <div className="mt-auto flex items-center gap-4 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <BookOpen className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {stats?.lessons ?? "—"}
            </span>
            {t("lessons")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ClipboardList className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {stats?.assignments ?? "—"}
            </span>
            {t("assignments")}
          </span>
        </div>
      </div>
    </article>
  );
}

export function CourseCardSkeleton() {
  return (
    <div className="flex h-full animate-pulse flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="h-32 bg-slate-200 dark:bg-slate-800" />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="h-4 w-3/4 rounded bg-slate-200 dark:bg-slate-800" />
        <div className="flex gap-2">
          <div className="h-5 w-16 rounded-full bg-slate-200 dark:bg-slate-800" />
          <div className="h-5 w-12 rounded-full bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="h-3 w-full rounded bg-slate-100 dark:bg-slate-800/60" />
        <div className="h-3 w-2/3 rounded bg-slate-100 dark:bg-slate-800/60" />
        <div className="mt-auto flex gap-4 border-t border-slate-100 pt-3 dark:border-slate-800">
          <div className="h-3 w-14 rounded bg-slate-100 dark:bg-slate-800/60" />
          <div className="h-3 w-14 rounded bg-slate-100 dark:bg-slate-800/60" />
        </div>
      </div>
    </div>
  );
}
