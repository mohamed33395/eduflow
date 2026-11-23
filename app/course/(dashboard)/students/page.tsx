"use client";

import { useEffect, useState } from "react";
import { useLocalStorageValue } from "@/app/hooks/useLocalStorageValue";
import { getStudents } from "@/app/services/students";
import { Table } from "@/app/components/ui/table";
import { useI18n } from "@/app/lib/i18n/client";
import type { Student } from "@/app/types";

export default function CourseStudentsPage() {
  const { t } = useI18n();
  const [students, setStudents] = useState<Student[]>([]);
  const courseId = useLocalStorageValue("courseId");

  useEffect(() => {
    if (courseId) {
      getStudents(undefined, courseId).then(setStudents);
    }
  }, [courseId]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        {t("enrolledStudents")}
      </h1>
      <Table
        columns={[
          { key: "name", header: t("name") },
          { key: "username", header: t("username") },
          { key: "email", header: t("email") },
        ]}
        rows={students}
        keyExtractor={(row) => row.id}
      />
    </div>
  );
}
