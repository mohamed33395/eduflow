"use client";

import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { getTeacherById } from "@/app/services/teachers";
import { getSubmissions, gradeSubmission, getAssignments } from "@/app/services/assignments";
import { Table } from "@/app/components/ui/table";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { formatDate } from "@/app/lib/utils";
import { useI18n } from "@/app/lib/i18n/client";
import type { Submission, Assignment } from "@/app/types";

export default function TeacherSubmissionsPage() {
  const { t } = useI18n();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [grading, setGrading] = useState<Record<string, { grade: string; feedback: string }>>({});

  useEffect(() => {
    const auth = getAuth();
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    getTeacherById(uid).then(async (t) => {
      if (!t) return;
      const allAssignments: Assignment[] = [];
      for (const cid of t.assignedCourses) {
        const list = await getAssignments(cid);
        allAssignments.push(...list);
      }
      setAssignments(allAssignments);

      const allSubmissions: Submission[] = [];
      for (const a of allAssignments) {
        const list = await getSubmissions(a.id);
        allSubmissions.push(...list);
      }
      setSubmissions(allSubmissions);
    });
  }, []);

  const handleGrade = async (id: string) => {
    const g = grading[id];
    if (!g) return;
    await gradeSubmission(id, Number(g.grade), g.feedback);
    setSubmissions((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, grade: Number(g.grade), feedback: g.feedback, status: "graded" }
          : s
      )
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        {t("submissions")}
      </h1>
      <Table
        columns={[
          { key: "studentId", header: t("studentId") },
          {
            key: "assignment",
            header: t("assignment"),
            render: (row: Submission) =>
              assignments.find((a) => a.id === row.assignmentId)?.title || t("none"),
          },
          {
            key: "file",
            header: t("file"),
            render: (row: Submission) =>
              row.fileUrl ? (
                <a
                  href={row.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-600 hover:underline"
                >
                  {t("download")}
                </a>
              ) : (
                row.text || t("none")
              ),
          },
          {
            key: "submittedAt",
            header: t("submittedAt"),
            render: (row: Submission) => formatDate(row.submittedAt),
          },
          {
            key: "grade",
            header: t("grade"),
            render: (row: Submission) =>
              row.grade !== undefined ? row.grade : t("pending"),
          },
          {
            key: "actions",
            header: t("grade"),
            render: (row: Submission) => (
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder={t("grade")}
                  className="w-24"
                  value={grading[row.id]?.grade || ""}
                  onChange={(e) =>
                    setGrading((p) => ({
                      ...p,
                      [row.id]: {
                        ...p[row.id],
                        grade: e.target.value,
                      },
                    }))
                  }
                />
                <Input
                  placeholder={t("feedback")}
                  value={grading[row.id]?.feedback || ""}
                  onChange={(e) =>
                    setGrading((p) => ({
                      ...p,
                      [row.id]: {
                        ...p[row.id],
                        feedback: e.target.value,
                      },
                    }))
                  }
                />
                <Button size="sm" onClick={() => handleGrade(row.id)}>
                  {t("save")}
                </Button>
              </div>
            ),
          },
        ]}
        rows={submissions}
        keyExtractor={(row) => row.id}
      />
    </div>
  );
}
