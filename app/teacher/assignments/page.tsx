"use client";

import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { getTeacherById } from "@/app/services/teachers";
import { getAssignments, createAssignment } from "@/app/services/assignments";
import { Table } from "@/app/components/ui/table";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Select } from "@/app/components/ui/select";
import { formatDate } from "@/app/lib/utils";
import { useI18n } from "@/app/lib/i18n/client";
import type { Assignment } from "@/app/types";

export default function TeacherAssignmentsPage() {
  const { t } = useI18n();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([]);
  const [teacherId, setTeacherId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    courseId: "",
    title: "",
    description: "",
    deadline: "",
    maxGrade: 100,
  });

  useEffect(() => {
    const auth = getAuth();
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    setTeacherId(uid);
    getTeacherById(uid).then(async (t) => {
      if (!t) return;
      const { getCourseById } = await import("@/app/services/courses");
      const courseList = await Promise.all(
        t.assignedCourses.map((id) => getCourseById(id))
      );
      setCourses(
        courseList
          .filter(Boolean)
          .map((c) => ({ id: c!.id, name: c!.name }))
      );

      const all: Assignment[] = [];
      for (const cid of t.assignedCourses) {
        const list = await getAssignments(cid);
        all.push(...list);
      }
      setAssignments(all);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.courseId || !teacherId) return;
    await createAssignment({
      courseId: form.courseId,
      teacherId,
      title: form.title,
      description: form.description,
      deadline: form.deadline,
      maxGrade: form.maxGrade,
    });
    setShowForm(false);
    setForm({ courseId: "", title: "", description: "", deadline: "", maxGrade: 100 });
    const all: Assignment[] = [];
    for (const c of courses) {
      const list = await getAssignments(c.id);
      all.push(...list);
    }
    setAssignments(all);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t("assignments")}
        </h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? t("cancel") : t("createAssignment")}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-6"
        >
          <Select
            label={t("course")}
            options={courses.map((c) => ({ value: c.id, label: c.name }))}
            value={form.courseId}
            onChange={(e) => setForm({ ...form, courseId: e.target.value })}
            required
          />
          <Input
            label={t("title")}
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <Input
            label={t("description")}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Input
            label={t("deadline")}
            type="datetime-local"
            required
            value={form.deadline}
            onChange={(e) => setForm({ ...form, deadline: e.target.value })}
          />
          <Input
            label={t("maxGrade")}
            type="number"
            value={form.maxGrade}
            onChange={(e) =>
              setForm({ ...form, maxGrade: Number(e.target.value) })
            }
          />
          <Button type="submit">{t("create")}</Button>
        </form>
      )}

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
            key: "maxGrade",
            header: t("max"),
            render: (row: Assignment) => row.maxGrade,
          },
        ]}
        rows={assignments}
        keyExtractor={(row) => row.id}
      />
    </div>
  );
}
