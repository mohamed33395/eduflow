"use client";

import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { getTeacherById } from "@/app/services/teachers";
import { getCourses } from "@/app/services/courses";
import { Card } from "@/app/components/ui/card";
import { useI18n } from "@/app/lib/i18n/client";
import type { Course, Teacher } from "@/app/types";

export default function TeacherCoursesPage() {
  const { t } = useI18n();
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    const auth = getAuth();
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    getTeacherById(uid).then((t) => {
      setTeacher(t);
      getCourses().then((all) => {
        setCourses(all.filter((c) => t?.assignedCourses.includes(c.id)));
      });
    });
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        {t("myCourses")}
      </h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((c) => (
          <Card key={c.id}>
            <h3 className="font-semibold text-slate-900">{c.name}</h3>
            <p className="text-sm text-slate-500">{c.type}</p>
            <p className="mt-2 text-xs text-slate-400">
              {t("level")}: {c.level} • {t("grades")}: {c.gradeFrom}-{c.gradeTo}
            </p>
          </Card>
        ))}
        {courses.length === 0 && (
          <p className="text-slate-500">{t("noCoursesAssigned")}</p>
        )}
      </div>
    </div>
  );
}
