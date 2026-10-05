"use client";

import { useEffect, useState } from "react";
import { getAuth } from "firebase/auth";
import { getAssignments, createAssignment } from "@/app/services/assignments";
import { Table } from "@/app/components/ui/table";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { formatDate } from "@/app/lib/utils";
import { useI18n } from "@/app/lib/i18n/client";
import type { Assignment } from "@/app/types";

export default function CourseAssignmentsPage() {
  const { t } = useI18n();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courseId, setCourseId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    deadline: "",
    maxGrade: 100,
  });

  useEffect(() => {
    const auth = getAuth();
    const cid = localStorage.getItem("courseId") || "";
    setCourseId(cid);
    const uid = auth.currentUser?.uid || "";
    setTeacherId(uid);
    if (cid) getAssignments(cid).then(setAssignments);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId || !teacherId) return;
    await createAssignment({
      courseId,
      teacherId,
      title: form.title,
      description: form.description,
      deadline: form.deadline,
      maxGrade: form.maxGrade,
    });
    setShowForm(false);
    setForm({ title: "", description: "", deadline: "", maxGrade: 100 });
    getAssignments(courseId).then(setAssignments);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t("assignments")}
        </h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? t("cancel") : t("addAssignment")}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-6"
        >
          <Input
            label={t("title")}
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <Input
            label={t("description")}
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
          />
          <Input
            label={t("deadline")}
            type="datetime-local"
            required
            value={form.deadline}
            onChange={(e) =>
              setForm({ ...form, deadline: e.target.value })
            }
          />
          <Input
            label={t("maxGrade")}
            type="number"
            value={form.maxGrade}
            onChange={(e) =>
              setForm({ ...form, maxGrade: Number(e.target.value) })
            }
          />
          <Button type="submit">{t("createAssignment")}</Button>
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
            header: t("maxGrade"),
            render: (row: Assignment) => row.maxGrade ?? t("none"),
          },
        ]}
        rows={assignments}
        keyExtractor={(row) => row.id}
      />
    </div>
  );
}
