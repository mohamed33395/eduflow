"use client";

import { useEffect, useState } from "react";
import { getStudents } from "@/app/services/students";
import { Table } from "@/app/components/ui/table";
import { useI18n } from "@/app/lib/i18n/client";
import type { Student } from "@/app/types";

export default function CourseStudentsPage() {
  const { t } = useI18n();
  const [students, setStudents] = useState<Student[]>([]);
  const [courseId, setCourseId] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("courseId") || "";
    setCourseId(id);
    if (id) {
      getStudents(undefined, id).then(setStudents);
    }
  }, []);

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
