"use client";

import { useMemo, useState } from "react";
import {
  CalendarDays,
  CalendarSearch,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  X,
  XCircle,
} from "lucide-react";
import { Badge } from "@/app/components/ui/badge";
import { useI18n } from "@/app/lib/i18n/client";
import { cn } from "@/app/lib/utils";
import type { AttendanceRecord } from "@/app/types";

type Status = AttendanceRecord["status"];

const STATUS_STYLE: Record<Status, { cell: string; dot: string }> = {
  present: {
    cell: "bg-emerald-500 text-white hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500",
    dot: "bg-emerald-500",
  },
  late: {
    cell: "bg-amber-400 text-white hover:bg-amber-500 dark:bg-amber-500 dark:hover:bg-amber-400",
    dot: "bg-amber-500",
  },
  absent: {
    cell: "bg-rose-500 text-white hover:bg-rose-600 dark:bg-rose-600 dark:hover:bg-rose-500",
    dot: "bg-rose-500",
  },
};

const SEVERITY: Status[] = ["absent", "late", "present"];

function toKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const SELECT_CLS =
  "rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-slate-700 shadow-sm outline-none transition hover:border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200";

export function AttendanceCalendar({
  records,
  courseNames = {},
}: {
  records: AttendanceRecord[];
  courseNames?: Record<string, string>;
}) {
  const { t, locale } = useI18n();
  const intl = locale === "ar" ? "ar-EG" : "en-US";

  const today = new Date();
  const todayKey = toKey(today.getFullYear(), today.getMonth(), today.getDate());
  const [view, setView] = useState({
    y: today.getFullYear(),
    m: today.getMonth(),
  });
  const [selected, setSelected] = useState<string | null>(todayKey);

  const byDay = useMemo(() => {
    const map = new Map<string, AttendanceRecord[]>();
    for (const r of records) {
      const d = new Date(r.date);
      const key = toKey(d.getFullYear(), d.getMonth(), d.getDate());
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return map;
  }, [records]);

  const monthStats = useMemo(() => {
    let present = 0, late = 0, absent = 0;
    for (const r of records) {
      const d = new Date(r.date);
      if (d.getFullYear() !== view.y || d.getMonth() !== view.m) continue;
      if (r.status === "present") present++;
      else if (r.status === "late") late++;
      else absent++;
    }
    const total = present + late + absent;
    return {
      present,
      late,
      absent,
      total,
      rate: total ? Math.round(((present + late * 0.5) / total) * 100) : 0,
    };
  }, [records, view]);

  const weekStart = locale === "ar" ? 6 : 0; // Sat for ar, Sun for en

  const days = useMemo(() => {
    const first = new Date(view.y, view.m, 1);
    const dim = new Date(view.y, view.m + 1, 0).getDate();
    const lead = (first.getDay() - weekStart + 7) % 7;
    const cells: ({ day: number; key: string } | null)[] = [
      ...Array.from({ length: lead }, () => null),
      ...Array.from({ length: dim }, (_, i) => ({
        day: i + 1,
        key: toKey(view.y, view.m, i + 1),
      })),
    ];
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [view, weekStart]);

  const weekdayNames = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(intl, { weekday: "short" });
    return Array.from({ length: 7 }, (_, i) =>
      fmt.format(new Date(2024, 0, weekStart === 6 ? 6 + i : 7 + i))
    );
  }, [intl, weekStart]);

  // month/year pickers
  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, m) => ({
        m,
        label: new Intl.DateTimeFormat(intl, { month: "long" }).format(
          new Date(2000, m, 1)
        ),
      })),
    [intl]
  );

  const yearOptions = useMemo(() => {
    const minY = records.reduce((acc, r) => {
      const y = new Date(r.date).getFullYear();
      return y < acc ? y : acc;
    }, today.getFullYear());
    const years: number[] = [];
    for (let y = minY; y <= today.getFullYear() + 1; y++) years.push(y);
    return years;
  }, [records, today]);

  const move = (delta: number) =>
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  /** Jump to an explicit date (search input) */
  const jumpTo = (key: string) => {
    if (!key) return;
    const [y, m] = key.split("-").map(Number);
    setView({ y, m: m - 1 });
    setSelected(key);
  };

  const isViewingCurrentMonth =
    view.y === today.getFullYear() && view.m === today.getMonth();
  const selectedDay = selected ? byDay.get(selected) : null;

  return (
    <div className="space-y-5">
      {/* stats for the viewed month */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          label={t("present")}
          value={monthStats.present}
        />
        <StatCard
          icon={<Clock3 className="h-4 w-4 text-amber-500" />}
          label={t("late")}
          value={monthStats.late}
        />
        <StatCard
          icon={<XCircle className="h-4 w-4 text-rose-500" />}
          label={t("absent")}
          value={monthStats.absent}
        />
        <StatCard
          icon={<CalendarDays className="h-4 w-4 text-sky-500" />}
          label={t("attendanceRate")}
          value={`${monthStats.rate}%`}
        />
      </div>

      {/* search / jump controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <CalendarSearch className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="date"
            value={selected ?? ""}
            onChange={(e) => jumpTo(e.target.value)}
            max={todayKey}
            className={cn(SELECT_CLS, "ps-8 pe-2")}
            aria-label={t("selectDayHint")}
          />
        </div>
        <select
          value={view.m}
          onChange={(e) =>
            setView((v) => ({ ...v, m: Number(e.target.value) }))
          }
          className={SELECT_CLS}
          aria-label="month"
        >
          {monthOptions.map((o) => (
            <option key={o.m} value={o.m}>
              {o.label}
            </option>
          ))}
        </select>
        <select
          value={view.y}
          onChange={(e) =>
            setView((v) => ({ ...v, y: Number(e.target.value) }))
          }
          className={SELECT_CLS}
          aria-label="year"
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        {!isViewingCurrentMonth && (
          <button
            onClick={() => {
              setView({ y: today.getFullYear(), m: today.getMonth() });
              setSelected(todayKey);
            }}
            className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20"
          >
            {t("today")}
          </button>
        )}
      </div>

      {/* calendar card */}
      <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* month header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <button
            onClick={() => move(-1)}
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="prev"
          >
            <ChevronRight className="h-5 w-5 rtl:hidden" />
            <ChevronLeft className="hidden h-5 w-5 rtl:block" />
          </button>
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {new Intl.DateTimeFormat(intl, {
              month: "long",
              year: "numeric",
            }).format(new Date(view.y, view.m, 1))}
          </h2>
          <button
            onClick={() => move(1)}
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
            aria-label="next"
          >
            <ChevronLeft className="h-5 w-5 rtl:hidden" />
            <ChevronRight className="hidden h-5 w-5 rtl:block" />
          </button>
        </div>

        {/* weekday names */}
        <div className="grid grid-cols-7 border-b border-slate-100 px-3 py-2 dark:border-slate-800">
          {weekdayNames.map((w) => (
            <div
              key={w}
              className="text-center text-xs font-semibold uppercase tracking-wide text-slate-400"
            >
              {w}
            </div>
          ))}
        </div>

        {/* days grid */}
        <div className="grid grid-cols-7 gap-0.5 p-2">
          {days.map((cell, i) => {
            if (!cell) return <div key={`e${i}`} className="aspect-square" />;
            const recs = byDay.get(cell.key) ?? [];
            const worst = SEVERITY.find((s) =>
              recs.some((r) => r.status === s)
            );
            const isToday = cell.key === todayKey;
            const isFuture = cell.key > todayKey;
            const isSelected = cell.key === selected;
            const DayIcon =
              worst === "present"
                ? Check
                : worst === "late"
                  ? Clock3
                  : worst === "absent"
                    ? X
                    : null;
            return (
              <button
                key={cell.key}
                onClick={() => setSelected(cell.key)}
                title={
                  recs.length
                    ? recs.map((r) => t(r.status)).join("، ")
                    : undefined
                }
                className={cn(
                  "flex aspect-square flex-col items-center justify-center gap-px rounded-md text-xs font-semibold transition",
                  worst && !isFuture
                    ? STATUS_STYLE[worst].cell
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60",
                  isSelected &&
                    "ring-2 ring-primary ring-offset-1 dark:ring-offset-slate-900",
                  isFuture && "opacity-40"
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full",
                    isToday && "bg-white/30 ring-2 ring-primary"
                  )}
                >
                  {cell.day}
                </span>
                {DayIcon && !isFuture && (
                  <DayIcon className="h-3 w-3 text-white" strokeWidth={3} />
                )}
              </button>
            );
          })}
        </div>

        {/* legend */}
        <div className="flex items-center justify-center gap-5 border-t border-slate-100 px-4 py-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
          {(["present", "late", "absent"] as Status[]).map((s) => (
            <span key={s} className="inline-flex items-center gap-1.5">
              <span
                className={cn("h-2 w-2 rounded-full", STATUS_STYLE[s].dot)}
              />
              {t(s)}
            </span>
          ))}
        </div>
      </div>

      {/* selected day detail */}
      <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
          <CalendarDays className="h-4 w-4 text-primary" />
          {selected
            ? new Intl.DateTimeFormat(intl, {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              }).format(new Date(selected))
            : t("selectDayHint")}
        </h3>
        {selectedDay && selectedDay.length > 0 ? (
          <ul className="space-y-2">
            {selectedDay.map((r) => {
              const Icon =
                r.status === "present"
                  ? CheckCircle2
                  : r.status === "late"
                    ? Clock3
                    : XCircle;
              return (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-800/60"
                >
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {(r.courseId && courseNames[r.courseId]) || t("course")}
                  </span>
                  <Badge
                    variant={
                      r.status === "present"
                        ? "success"
                        : r.status === "late"
                          ? "warning"
                          : "danger"
                    }
                    className="gap-1"
                  >
                    <Icon className="h-3 w-3" />
                    {t(r.status)}
                  </Badge>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-slate-400 dark:text-slate-500">
            {selected ? t("noAttendanceRecords") : t("selectDayHint")}
          </p>
        )}
      </div>
    </div>
  );
}

function StatCard({
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
