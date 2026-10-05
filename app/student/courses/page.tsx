"use client";

import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { getStudentById } from "@/app/services/students";
import { getCourses } from "@/app/services/courses";
import { Card } from "@/app/components/ui/card";
import { useI18n } from "@/app/lib/i18n/client";
import type { Course } from "@/app/types";

export default function StudentCoursesPage() {
  const { t } = useI18n();
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    const auth = getAuth();
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    getStudentById(uid).then((student) => {
      if (!student) return;
      getCourses().then((all) => {
        setCourses(all.filter((c) => student.courses.includes(c.id)));
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
            <p className="mt-3 text-sm text-slate-700">{c.description}</p>
          </Card>
        ))}
        {courses.length === 0 && (
          <p className="text-slate-500">{t("notEnrolledInAnyCourses")}</p>
        )}
      </div>
    </div>
  );
}
