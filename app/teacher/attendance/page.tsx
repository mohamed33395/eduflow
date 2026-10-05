"use client";

import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { getTeacherById } from "@/app/services/teachers";
import { getCourseById } from "@/app/services/courses";
import { getStudents } from "@/app/services/students";
import { markAttendance } from "@/app/services/attendance";
import { Select } from "@/app/components/ui/select";
import { Button } from "@/app/components/ui/button";
import { useI18n } from "@/app/lib/i18n/client";
import type { Student } from "@/app/types";

export default function TeacherAttendancePage() {
  const { t } = useI18n();
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [statusMap, setStatusMap] = useState<Record<string, "present" | "absent" | "late">>({});

  useEffect(() => {
    const auth = getAuth();
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    getTeacherById(uid).then(async (t) => {
      if (!t) return;
      const list = await Promise.all(
        t.assignedCourses.map((id) => getCourseById(id))
      );
      const filtered = list.filter(Boolean).map((c) => ({ id: c!.id, name: c!.name }));
      setCourses(filtered);
      if (filtered[0]) setSelectedCourse(filtered[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selectedCourse) return;
    getStudents().then((all) => {
      setStudents(all.filter((s) => s.courses.includes(selectedCourse)));
    });
  }, [selectedCourse]);

  const setStatus = (id: string, status: "present" | "absent" | "late") => {
    setStatusMap((prev) => ({ ...prev, [id]: status }));
  };

  const save = async () => {
    await Promise.all(
      students.map((s) =>
        statusMap[s.id]
          ? markAttendance({
              userId: s.id,
              courseId: selectedCourse,
              date,
              status: statusMap[s.id],
            })
          : Promise.resolve()
      )
    );
    alert(t("attendanceSaved"));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        {t("recordAttendance")}
      </h1>
      <div className="flex flex-wrap items-center gap-4">
        <Select
          label={t("course")}
          options={courses.map((c) => ({ value: c.id, label: c.name }))}
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
        />
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
                          statusMap[s.id] === st
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
