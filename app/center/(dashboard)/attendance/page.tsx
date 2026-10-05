"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/hooks/useAuth";
import { markAttendance, getAttendance } from "@/app/services/attendance";
import { getStudents } from "@/app/services/students";
import { Button } from "@/app/components/ui/button";
import { useI18n } from "@/app/lib/i18n/client";
import type { Student, AttendanceRecord } from "@/app/types";

export default function CenterAttendancePage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const centerId = user?.centerId ?? "";

  const [students, setStudents] = useState<Student[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [records, setRecords] = useState<Record<string, AttendanceRecord["status"]>>({});

  useEffect(() => {
    if (!centerId) return;
    getStudents(centerId).then((mine) => {
      setStudents(mine);
      getAttendance().then((attendance) => {
        const studentIds = new Set(mine.map((s) => s.id));
        const map: Record<string, AttendanceRecord["status"]> = {};
        attendance
          .filter((r) => studentIds.has(r.userId))
          .forEach((r) => {
            if (r.date === date) map[r.userId] = r.status;
          });
        setRecords(map);
      });
    });
  }, [date, centerId]);

  const setStatus = (id: string, status: AttendanceRecord["status"]) => {
    setRecords((prev) => ({ ...prev, [id]: status }));
  };

  const save = async () => {
    await Promise.all(
      students.map((s) =>
        records[s.id]
          ? markAttendance({
              userId: s.id,
              date,
              status: records[s.id],
            })
          : Promise.resolve()
      )
    );
    alert(t("attendanceSaved"));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        {t("attendance")}
      </h1>
      <div className="flex items-center gap-4">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-slate-300 px-4 py-2"
        />
        <Button onClick={save}>{t("saveAttendance")}</Button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3">{t("student")}</th>
              <th className="px-4 py-3">{t("status")}</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="px-4 py-3">{s.name}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {(["present", "absent", "late"] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => setStatus(s.id, st)}
                        className={`rounded px-3 py-1 text-xs font-semibold ${
                          records[s.id] === st
                            ? st === "present"
                              ? "bg-green-100 text-green-700"
                              : st === "absent"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {t(st)}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
