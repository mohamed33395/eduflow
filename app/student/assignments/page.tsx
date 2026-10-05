"use client";

import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { getStudentById } from "@/app/services/students";
import { getAssignments, createSubmission } from "@/app/services/assignments";
import { getCourses } from "@/app/services/courses";
import { Table } from "@/app/components/ui/table";
import { Button } from "@/app/components/ui/button";
import { uploadFile } from "@/app/services/storage";
import { formatDate } from "@/app/lib/utils";
import { useI18n } from "@/app/lib/i18n/client";
import type { Assignment, Course } from "@/app/types";

export default function StudentAssignmentsPage() {
  const { t } = useI18n();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Record<string, Course>>({});
  const [selectedFile, setSelectedFile] = useState<Record<string, File | null>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const auth = getAuth();
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    getStudentById(uid).then(async (student) => {
      if (!student) return;
      const courseList = await getCourses();
      const courseMap: Record<string, Course> = {};
      courseList.forEach((c) => (courseMap[c.id] = c));
      setCourses(courseMap);

      const all: Assignment[] = [];
      for (const cid of student.courses) {
        const list = await getAssignments(cid);
        all.push(...list);
      }
      setAssignments(all);
    });
  }, []);

  const handleFile = (id: string, file: File | null) => {
    setSelectedFile((p) => ({ ...p, [id]: file }));
  };

  const submit = async (assignmentId: string) => {
    const auth = getAuth();
    const studentId = auth.currentUser?.uid;
    if (!studentId) return;

    const file = selectedFile[assignmentId];
    if (!file) {
      await createSubmission({
        assignmentId,
        studentId,
        status: "pending",
      });
    } else {
      setUploading((p) => ({ ...p, [assignmentId]: true }));
      const res = await uploadFile(file, "submissions");
      setUploading((p) => ({ ...p, [assignmentId]: false }));
      await createSubmission({
        assignmentId,
        studentId,
        fileUrl: res.url,
        status: "pending",
      });
    }
    alert(t("submittedSuccessfully"));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        {t("assignments")}
      </h1>
      <Table
        columns={[
          { key: "title", header: t("title") },
          { key: "description", header: t("description") },
          {
            key: "deadline",
            header: t("deadline"),
            render: (row: Assignment) => formatDate(row.deadline),
          },
          {
            key: "course",
            header: t("course"),
            render: (row: Assignment) => courses[row.courseId]?.name || t("none"),
          },
          {
            key: "actions",
            header: t("submit"),
            render: (row: Assignment) => (
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  onChange={(e) =>
                    handleFile(row.id, e.target.files?.[0] ?? null)
                  }
                  className="text-sm"
                />
                <Button
                  size="sm"
                  onClick={() => submit(row.id)}
                  disabled={uploading[row.id]}
                >
                  {uploading[row.id] ? t("uploading") : t("submit")}
                </Button>
              </div>
            ),
          },
        ]}
        rows={assignments}
        keyExtractor={(row) => row.id}
      />
    </div>
  );
}
