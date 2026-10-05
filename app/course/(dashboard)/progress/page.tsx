"use client";

import { useEffect, useState } from "react";
import { getStudents } from "@/app/services/students";
import { getLessons } from "@/app/services/lessons";
import { getSubmissions, getAssignments } from "@/app/services/assignments";
import { Table } from "@/app/components/ui/table";
import type { Student } from "@/app/types";

export default function CourseProgressPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [courseId, setCourseId] = useState("");
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [grades, setGrades] = useState<Record<string, number>>({});

  useEffect(() => {
    const id = localStorage.getItem("courseId") || "";
    setCourseId(id);
    loadProgress(id);
  }, []);

  const loadProgress = async (id: string) => {
    if (!id) return;
    const [enrolled, lessons, assignments] = await Promise.all([
      getStudents(undefined, id),
      getLessons(id),
      getAssignments(id),
    ]);
    setStudents(enrolled);

    const progressMap: Record<string, number> = {};
    const gradeMap: Record<string, number> = {};

    for (const s of enrolled) {
      const subs = await getStudentSubmissionsForCourse(s.id, assignments.map((a) => a.id));
      const graded = subs.filter((sub) => sub.grade !== undefined);
      const avgGrade =
        graded.length > 0
          ? graded.reduce((sum, sub) => sum + (sub.grade ?? 0), 0) / graded.length
          : 0;
      gradeMap[s.id] = Math.round(avgGrade);
      progressMap[s.id] = Math.round((subs.length / Math.max(1, assignments.length)) * 100);
    }

    setProgress(progressMap);
    setGrades(gradeMap);
  };

  const getStudentSubmissionsForCourse = async (studentId: string, assignmentIds: string[]) => {
    const all = await Promise.all(
      assignmentIds.map((aid) => getSubmissions(aid))
    );
    return all.flat().filter((s) => s.studentId === studentId);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
        Student Progress
      </h1>
      <Table
        columns={[
          { key: "name", header: "Student" },
          {
            key: "progress",
            header: "Progress",
            render: (row: Student) => (
              <div className="w-full max-w-xs">
                <div className="h-2.5 w-full rounded-full bg-slate-200">
                  <div
                    className="h-2.5 rounded-full bg-indigo-600"
                    style={{ width: `${progress[row.id] || 0}%` }}
                  />
                </div>
                <span className="text-xs text-slate-500">
                  {progress[row.id] || 0}%
                </span>
              </div>
            ),
          },
          {
            key: "grade",
            header: "Avg Grade",
            render: (row: Student) => grades[row.id] ?? "—",
          },
        ]}
        rows={students}
        keyExtractor={(row) => row.id}
      />
    </div>
  );
}
