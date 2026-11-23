"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/hooks/useAuth";
import { getAttendance } from "@/app/services/attendance";
import { getCourses } from "@/app/services/courses";
import { AttendanceCalendar } from "@/app/components/AttendanceCalendar";
import { useI18n } from "@/app/lib/i18n/client";
import type { AttendanceRecord } from "@/app/types";

export default function StudentAttendancePage() {
  const { t } = useI18n();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [courseNames, setCourseNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();

  useEffect(() => {
    const uid = user?.uid;
    if (!uid) return;
    let cancelled = false;

    (async () => {
      const [list, courses] = await Promise.all([
        getAttendance(uid),
        getCourses().catch(() => []),
      ]);
      if (cancelled) return;
      setRecords(
        list.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )
      );
      setCourseNames(
        Object.fromEntries(courses.map((c) => [c.id, c.name] as const))
      );
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        {t("myAttendance")}
      </h1>
      {loading ? (
        <div className="h-96 animate-pulse rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900" />
      ) : (
        <AttendanceCalendar records={records} courseNames={courseNames} />
      )}
    </div>
  );
}
