"use client";

import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { getStudentById } from "@/app/services/students";
import { getAssignments, getSubmissions } from "@/app/services/assignments";
import { getCourses } from "@/app/services/courses";
import { Table } from "@/app/components/ui/table";
import { useI18n } from "@/app/lib/i18n/client";
import type { Assignment, Submission } from "@/app/types";

export default function StudentGradesPage() {
  const { t } = useI18n();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [assignments, setAssignments] = useState<Record<string, Assignment>>({});
  const [courses, setCourses] = useState<Record<string, string>>({});

  useEffect(() => {
    const auth = getAuth();
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    getStudentById(uid).then(async (student) => {
      if (!student) return;
      const courseList = await getCourses();
      const courseMap: Record<string, string> = {};
      courseList.forEach((c) => (courseMap[c.id] = c.name));
      setCourses(courseMap);

      const all: Submission[] = [];
      const assignmentMap: Record<string, Assignment> = {};
      for (const cid of student.courses) {
        const list = await getAssignments(cid);
        for (const a of list) {
          assignmentMap[a.id] = a;
        }
      }
      setAssignments(assignmentMap);

      for (const a of Object.values(assignmentMap)) {
        const subs = await getSubmissions(a.id);
        const mine = subs.filter((s) => s.studentId === uid);
        all.push(...mine);
      }
      setSubmissions(all);
    });
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        {t("grades")}
      </h1>
      <Table
        columns={[
          {
            key: "assignment",
            header: t("assignment"),
            render: (row: Submission) =>
              assignments[row.assignmentId]?.title || t("none"),
          },
          {
            key: "course",
            header: t("course"),
            render: (row: Submission) =>
              courses[
                assignments[row.assignmentId]?.courseId || ""
              ] || t("none"),
          },
          {
            key: "grade",
            header: t("grade"),
            render: (row: Submission) =>
              row.grade !== undefined ? `${row.grade} / ${assignments[row.assignmentId]?.maxGrade || 100}` : t("notGraded"),
          },
          {
            key: "feedback",
            header: t("feedback"),
            render: (row: Submission) => row.feedback || t("none"),
          },
        ]}
        rows={submissions}
        keyExtractor={(row) => row.id}
      />
    </div>
  );
}
