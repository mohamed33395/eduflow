"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  ScanBarcode,
  ScanLine,
  Search,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/app/hooks/useAuth";
import {
  getAttendance,
  saveAttendanceEntries,
  updateAttendance,
} from "@/app/services/attendance";
import { getStudents } from "@/app/services/students";
import { Button } from "@/app/components/ui/button";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/app/components/ui/avatar";
import { useI18n } from "@/app/lib/i18n/client";
import type { Student, AttendanceRecord } from "@/app/types";

type Status = AttendanceRecord["status"];

const STATUS_META: Record<
  Status,
  { activeCls: string; statCls: string }
> = {
  present: {
    activeCls:
      "bg-green-600 text-white ring-green-600 dark:bg-green-700 dark:ring-green-700",
    statCls:
      "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  },
  late: {
    activeCls:
      "bg-amber-500 text-white ring-amber-500 dark:bg-amber-600 dark:ring-amber-600",
    statCls:
      "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  absent: {
    activeCls:
      "bg-red-600 text-white ring-red-600 dark:bg-red-700 dark:ring-red-700",
    statCls: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
  },
};

const STATUS_ICON: Record<Status, typeof CheckCircle2> = {
  present: CheckCircle2,
  late: Clock,
  absent: XCircle,
};

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
}

export default function CenterAttendancePage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const centerId = user?.centerId ?? "";

  const [students, setStudents] = useState<Student[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  /** working marks (what the staff member is editing) */
  const [records, setRecords] = useState<Record<string, Status>>({});
  /** last saved snapshot per user, including the backend record id */
  const [saved, setSaved] = useState<
    Record<string, { status: Status; recordId?: string }>
  >({});
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<"saved" | "error" | "">("");

  const load = async () => {
    if (!centerId) return;
    const mine = await getStudents(centerId);
    setStudents(mine);
    const attendance = await getAttendance();
    const studentIds = new Set(mine.map((s) => s.id));
    const map: Record<string, { status: Status; recordId?: string }> = {};
    for (const r of attendance) {
      if (!studentIds.has(r.userId)) continue;
      // backend stores midnight-UTC instants — compare the day part
      if (r.date?.slice(0, 10) !== date) continue;
      map[r.userId] = { status: r.status, recordId: r.id };
    }
    setSaved(map);
    setRecords(
      Object.fromEntries(
        Object.entries(map).map(([k, v]) => [k, v.status])
      ) as Record<string, Status>
    );
  };

  useEffect(() => {
    const id = setTimeout(() => {
      setNotice("");
      void load();
    }, 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, centerId]);

  const counts = useMemo(() => {
    let present = 0,
      late = 0,
      absent = 0;
    for (const s of students) {
      const st = records[s.id];
      if (st === "present") present++;
      else if (st === "late") late++;
      else if (st === "absent") absent++;
    }
    return { present, late, absent, unmarked: students.length - present - late - absent };
  }, [students, records]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => s.name.toLowerCase().includes(q));
  }, [students, search]);

  const dirtyCount = useMemo(
    () =>
      students.filter(
        (s) =>
          records[s.id] !== undefined && records[s.id] !== saved[s.id]?.status
      ).length,
    [students, records, saved]
  );

  const setStatus = (id: string, status: Status) => {
    setNotice("");
    setRecords((prev) => {
      const next = { ...prev };
      if (next[id] === status) delete next[id];
      else next[id] = status;
      return next;
    });
  };

  const markAllPresent = () => {
    setNotice("");
    setRecords((prev) => {
      const next = { ...prev };
      for (const s of filtered) next[s.id] = "present";
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    setNotice("");
    try {
      const create: { userId: string; status: Status }[] = [];
      const patch: Promise<void>[] = [];
      for (const s of students) {
        const st = records[s.id];
        if (!st || st === saved[s.id]?.status) continue;
        const recId = saved[s.id]?.recordId;
        if (recId) patch.push(updateAttendance(recId, st));
        else create.push({ userId: s.id, status: st });
      }
      await Promise.all([saveAttendanceEntries(date, create), ...patch]);
      await load();
      setNotice("saved");
    } catch {
      setNotice("error");
    } finally {
      setSaving(false);
    }
  };

  const stats: {
    label: string;
    value: number;
    icon: typeof Users;
    cls: string;
  }[] = [
    {
      label: t("students"),
      value: students.length,
      icon: Users,
      cls: "bg-primary/10 text-primary",
    },
    {
      label: t("present"),
      value: counts.present,
      icon: CheckCircle2,
      cls: STATUS_META.present.statCls,
    },
    {
      label: t("late"),
      value: counts.late,
      icon: Clock,
      cls: STATUS_META.late.statCls,
    },
    {
      label: t("absent"),
      value: counts.absent,
      icon: XCircle,
      cls: STATUS_META.absent.statCls,
    },
    {
      label: t("unmarked"),
      value: counts.unmarked,
      icon: UserCheck,
      cls: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    },
  ];

  return (
    <div className="space-y-6">
      {/* header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t("attendance")}
        </h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-40 rounded-xl border border-slate-200 bg-white py-2 ps-9 pe-3 text-sm shadow-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <Button variant="outline" href="/center/attendance/scan">
            <ScanLine className="h-4 w-4" />
            {t("scanQr")}
          </Button>
          <Button variant="outline" href="/center/attendance/kiosk">
            <ScanBarcode className="h-4 w-4" />
            {t("attendanceKiosk")}
          </Button>
          <Button onClick={save} disabled={saving || dirtyCount === 0}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("saveAttendance")}
          </Button>
        </div>
      </div>

      {notice === "saved" && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700 dark:bg-green-950/50 dark:text-green-300">
          {t("attendanceSaved")}
        </p>
      )}
      {notice === "error" && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/50">
          {t("failedToSaveAttendance")}
        </p>
      )}

      {/* stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.cls}`}
            >
              <s.icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <div className="text-xl font-bold text-slate-900 dark:text-white">
                {s.value}
              </div>
              <div className="truncate text-xs text-slate-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchByName")}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 ps-9 pe-3 text-sm shadow-sm outline-none placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>
        <Button variant="outline" size="sm" onClick={markAllPresent}>
          <UserCheck className="h-4 w-4" />
          {t("markAllPresent")}
        </Button>
        <span className="ms-auto text-sm text-slate-500">
          {dirtyCount > 0 ? `${dirtyCount} ${t("unsavedChanges")}` : ""}
        </span>
      </div>

      {/* list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 py-14 text-slate-400 dark:border-slate-700">
          <Users className="h-9 w-9" />
          <p className="text-sm font-medium">{t("noData")}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((s) => {
            const active = records[s.id];
            const isSaved = saved[s.id]?.status === active && !!active;
            return (
              <li
                key={s.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-colors hover:border-primary/40 dark:border-slate-800 dark:bg-slate-900"
              >
                <Avatar className="h-10 w-10">
                  {s.avatarUrl && (
                    <AvatarImage src={s.avatarUrl} alt={s.name} />
                  )}
                  <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
                    {initials(s.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold text-slate-900 dark:text-white">
                      {s.name}
                    </span>
                    {isSaved && (
                      <span className="text-xs font-medium text-green-600 dark:text-green-400">
                        {t("saved")}
                      </span>
                    )}
                  </div>
                  {s.username && (
                    <div className="truncate text-xs text-slate-400">
                      {s.username}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {(["present", "late", "absent"] as const).map((st) => {
                    const Icon = STATUS_ICON[st];
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setStatus(s.id, st)}
                        className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold ring-1 ring-inset transition-colors ${
                          active === st
                            ? STATUS_META[st].activeCls
                            : "bg-slate-50 text-slate-500 ring-slate-200 hover:bg-slate-100 dark:bg-slate-800/60 dark:text-slate-400 dark:ring-slate-700 dark:hover:bg-slate-800"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {t(st)}
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
