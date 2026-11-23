"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/hooks/useAuth";
import { getTeacherById } from "@/app/services/teachers";
import { getCourseById } from "@/app/services/courses";
import { getStudents } from "@/app/services/students";
import { markAttendance } from "@/app/services/attendance";
import { Select } from "@/app/components/ui/select";
import { Button } from "@/app/components/ui/button";
import { Table } from "@/app/components/ui/table";
import { useI18n } from "@/app/lib/i18n/client";
import type { Student } from "@/app/types";

export default function TeacherAttendancePage() {
  const { t } = useI18n();
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([]);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [statusMap, setStatusMap] = useState<Record<string, "present" | "absent" | "late">>({});

  const { user } = useAuth();

  useEffect(() => {
    const uid = user?.uid;
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
  }, [user?.uid]);

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
          className="rounded-lg border border-input bg-background px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button onClick={save}>{t("saveAttendance")}</Button>
      </div>

      <Table
        columns={[
          {
            key: "name",
            header: t("student"),
            render: (s: Student) => (
              <span className="font-medium">{s.name}</span>
            ),
          },
          {
            key: "status",
            header: t("status"),
            render: (s: Student) => (
              <div className="flex gap-2">
                {(["present", "absent", "late"] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatus(s.id, st)}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition-colors ${
                      statusMap[s.id] === st
                        ? st === "present"
                          ? "bg-green-100 text-green-700 ring-green-300 dark:bg-green-950 dark:text-green-300 dark:ring-green-800"
                          : st === "absent"
                          ? "bg-red-100 text-red-700 ring-red-300 dark:bg-red-950 dark:text-red-300 dark:ring-red-800"
                          : "bg-amber-100 text-amber-700 ring-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-800"
                        : "bg-muted text-muted-foreground ring-border hover:bg-accent"
                    }`}
                  >
                    {t(st)}
                  </button>
                ))}
              </div>
            ),
          },
        ]}
        rows={students}
        keyExtractor={(s) => s.id}
        emptyText={t("noData")}
      />
    </div>
  );
}
