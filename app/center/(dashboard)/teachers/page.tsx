"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/app/hooks/useAuth";
import { getTeachers } from "@/app/services/teachers";
import { Table } from "@/app/components/ui/table";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Select } from "@/app/components/ui/select";
import { useI18n } from "@/app/lib/i18n/client";
import type {
  Teacher,
  EducationLevel,
  CenterSettings,
  CenterSubject,
  SubjectAssignment,
} from "@/app/types";

const GRADES_BY_LEVEL: Record<EducationLevel, number[]> = {
  kindergarten: [1, 2],
  primary: [1, 2, 3, 4, 5, 6],
  middle: [1, 2, 3],
  high: [1, 2, 3],
};

function gradeOptions(level: EducationLevel, t: (k: string) => string) {
  return GRADES_BY_LEVEL[level].map((g) => ({
    value: String(g),
    label: `${g} ${t("year")}`,
  }));
}

function subjectLabel(subject: CenterSubject, t: (k: string) => string) {
  const level = t(subject.level);
  const track = subject.track ? ` - ${t(subject.track)}` : "";
  return `${subject.name} (${level} ${subject.grade}${track})`;
}

export default function CenterTeachersPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const centerId = user?.centerId ?? "";

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [settings, setSettings] = useState<CenterSettings | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    avatarUrl: "",
  });
  const [subjectAssignments, setSubjectAssignments] = useState<
    Record<string, SubjectAssignment>
  >({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [subjectLevel, setSubjectLevel] = useState<EducationLevel | "">("");
  const [defaultRange, setDefaultRange] = useState<{ from: number; to: number }>({
    from: 1,
    to: 1,
  });

  useEffect(() => {
    if (!centerId) return;
    getTeachers(centerId)
      .then(setTeachers)
      .catch((err) => console.error("[CenterTeachersPage] load teachers:", err));
    fetch("/api/center/settings", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load settings");
        return res.json();
      })
      .then((data: { settings: CenterSettings }) => setSettings(data.settings))
      .catch((err) => console.error("[CenterTeachersPage] settings load:", err));
  }, [centerId]);

  const filteredSubjects = useMemo(() => {
    if (!subjectLevel || !settings?.subjects) return [];
    return settings.subjects.filter((s) => s.level === subjectLevel);
  }, [settings, subjectLevel]);

  const allSubjectsSelected = useMemo(
    () =>
      filteredSubjects.length > 0 &&
      filteredSubjects.every((s) => subjectAssignments[s.id]),
    [filteredSubjects, subjectAssignments]
  );

  const updateDefaultRange = (next: Partial<typeof defaultRange>) => {
    setDefaultRange((prev) => {
      const updated = { ...prev, ...next };
      if (subjectLevel && GRADES_BY_LEVEL[subjectLevel]) {
        const grades = GRADES_BY_LEVEL[subjectLevel];
        if (!grades.includes(updated.from)) updated.from = grades[0];
        if (!grades.includes(updated.to)) updated.to = grades[grades.length - 1];
      }
      if (updated.from > updated.to) {
        const temp = updated.from;
        updated.from = updated.to;
        updated.to = temp;
      }
      return updated;
    });
  };

  const toggleSubject = (subject: CenterSubject) => {
    setSubjectAssignments((prev) => {
      if (prev[subject.id]) {
        const { [subject.id]: _, ...rest } = prev;
        return rest;
      }
      const from = Math.min(defaultRange.from, defaultRange.to);
      const to = Math.max(defaultRange.from, defaultRange.to);
      return {
        ...prev,
        [subject.id]: {
          subjectId: subject.id,
          level: subject.level,
          gradeFrom: from,
          gradeTo: to,
          track: subject.track,
        },
      };
    });
  };

  const toggleAllSubjects = () => {
    if (allSubjectsSelected) {
      setSubjectAssignments((prev) => {
        const next = { ...prev };
        for (const s of filteredSubjects) delete next[s.id];
        return next;
      });
      return;
    }
    const from = Math.min(defaultRange.from, defaultRange.to);
    const to = Math.max(defaultRange.from, defaultRange.to);
    setSubjectAssignments((prev) => {
      const next = { ...prev };
      for (const s of filteredSubjects) {
        next[s.id] = {
          subjectId: s.id,
          level: s.level,
          gradeFrom: from,
          gradeTo: to,
          track: s.track,
        };
      }
      return next;
    });
  };

  const updateAssignment = (
    subjectId: string,
    field: "gradeFrom" | "gradeTo",
    value: number
  ) => {
    setSubjectAssignments((prev) => {
      const current = prev[subjectId];
      if (!current) return prev;
      const next = { ...current, [field]: Math.max(1, value) };
      if (next.gradeFrom > next.gradeTo) {
        if (field === "gradeFrom") next.gradeTo = next.gradeFrom;
        else next.gradeFrom = next.gradeTo;
      }
      return { ...prev, [subjectId]: next };
    });
  };

  const handleLevelChange = (level: EducationLevel | "") => {
    setSubjectLevel(level);
    setSubjectAssignments({});
    if (level && GRADES_BY_LEVEL[level]) {
      const grades = GRADES_BY_LEVEL[level];
      setDefaultRange({ from: grades[0], to: grades[grades.length - 1] });
    } else {
      setDefaultRange({ from: 1, to: 1 });
    }
  };

  const resetForm = () => {
    setForm({ name: "", email: "", password: "", avatarUrl: "" });
    setSubjectAssignments({});
    setSubjectLevel("");
    setDefaultRange({ from: 1, to: 1 });
    setEditingId(null);
  };

  const startEdit = (teacher: Teacher) => {
    setForm({
      name: teacher.name,
      email: teacher.email,
      password: "",
      avatarUrl: teacher.avatarUrl || "",
    });
    const next: Record<string, SubjectAssignment> = {};
    for (const a of teacher.subjectAssignments ?? []) {
      next[a.subjectId] = a;
    }
    setSubjectAssignments(next);
    const first = teacher.subjectAssignments?.[0];
    if (first && GRADES_BY_LEVEL[first.level]) {
      setSubjectLevel(first.level);
      const grades = GRADES_BY_LEVEL[first.level];
      setDefaultRange({
        from: Math.min(...teacher.subjectAssignments!.map((a) => a.gradeFrom)),
        to: Math.max(...teacher.subjectAssignments!.map((a) => a.gradeTo)),
      });
    } else {
      setSubjectLevel("");
      setDefaultRange({ from: 1, to: 1 });
    }
    setEditingId(teacher.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (teacher: Teacher) => {
    if (!window.confirm(t("confirmDelete"))) return;
    try {
      const res = await fetch(`/api/center/teachers/${teacher.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res
          .json()
          .catch(() => ({ error: t("failedToDeleteTeacher") }));
        setError(data.error || t("failedToDeleteTeacher"));
        return;
      }
      setTeachers((prev) => prev.filter((t) => t.id !== teacher.id));
    } catch (err) {
      console.error("[CenterTeachersPage] delete teacher failed:", err);
      setError(t("failedToDeleteTeacher"));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!centerId) return;
    setError("");

    const cleanEmail = form.email.trim().toLowerCase();
    const assignments = Object.values(subjectAssignments);
    const assignedSubjectIds = assignments.map((a) => a.subjectId);

    try {
      if (editingId) {
        const res = await fetch(`/api/center/teachers/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: form.name.trim(),
            email: cleanEmail,
            avatarUrl: form.avatarUrl,
            assignedCourses: assignedSubjectIds,
            assignedSubjectIds,
            subjectAssignments: assignments,
          }),
        });

        if (!res.ok) {
          const data = await res
            .json()
            .catch(() => ({ error: t("failedToUpdateTeacher") }));
          setError(data.error || t("failedToUpdateTeacher"));
          return;
        }

        const { teacher } = (await res.json()) as { teacher: Teacher };
        setTeachers((prev) =>
          prev.map((t) => (t.id === teacher.id ? teacher : t))
        );
      } else {
        const res = await fetch("/api/center/teachers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: form.name.trim(),
            email: cleanEmail,
            password: form.password,
            avatarUrl: form.avatarUrl,
            assignedCourses: assignedSubjectIds,
            assignedSubjectIds,
            subjectAssignments: assignments,
          }),
        });

        if (!res.ok) {
          const data = await res
            .json()
            .catch(() => ({ error: t("failedToCreateTeacher") }));
          setError(data.error || t("failedToCreateTeacher"));
          return;
        }

        const { teacher } = (await res.json()) as { teacher: Teacher };
        setTeachers((prev) => [...prev, teacher]);
      }

      setShowForm(false);
      resetForm();
    } catch (err) {
      console.error("[CenterTeachersPage] save teacher failed:", err);
      setError(t("failedToCreateTeacher"));
    }
  };

  const getSubjectName = (id: string) =>
    settings?.subjects.find((s) => s.id === id)?.name ?? id;

  const levelOptions = [
    { value: "", label: t("selectLevel") },
    ...(["kindergarten", "primary", "middle", "high"] as EducationLevel[]).map(
      (l) => ({ value: l, label: t(l) })
    ),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t("teachers")}
        </h1>
        <Button
          onClick={() => {
            if (showForm) {
              setShowForm(false);
              resetForm();
            } else {
              setShowForm(true);
            }
          }}
        >
          {showForm ? t("cancel") : t("addTeacher")}
        </Button>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {showForm && (
        <form
          onSubmit={handleSave}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-6"
        >
          <h2 className="text-lg font-semibold text-slate-900">
            {editingId ? t("editTeacher") : t("addTeacher")}
          </h2>
          <Input
            label={t("fullName")}
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label={t("email")}
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          {!editingId && (
            <Input
              label={t("password")}
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          )}
          <Input
            label={t("avatarUrl")}
            type="url"
            value={form.avatarUrl}
            onChange={(e) => setForm({ ...form, avatarUrl: e.target.value })}
            placeholder="https://..."
          />

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              {t("subjects")}
            </label>
            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800">
              <Select
                label={t("level")}
                value={subjectLevel}
                options={levelOptions}
                onChange={(e) =>
                  handleLevelChange(e.target.value as EducationLevel | "")
                }
              />

              {subjectLevel ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Select
                      label={t("fromYear")}
                      value={String(defaultRange.from)}
                      options={gradeOptions(subjectLevel, t)}
                      onChange={(e) =>
                        updateDefaultRange({ from: Number(e.target.value) })
                      }
                    />
                    <Select
                      label={t("toYear")}
                      value={String(defaultRange.to)}
                      options={gradeOptions(subjectLevel, t)}
                      onChange={(e) =>
                        updateDefaultRange({ to: Number(e.target.value) })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    {filteredSubjects.length > 0 && (
                      <label className="flex items-center gap-2 border-b border-slate-200 pb-2 dark:border-slate-700">
                        <input
                          type="checkbox"
                          checked={allSubjectsSelected}
                          onChange={toggleAllSubjects}
                          className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-200">
                          {t("allSubjects")}
                        </span>
                      </label>
                    )}
                    {filteredSubjects.map((subject) => {
                      const assignment = subjectAssignments[subject.id];
                      return (
                        <div
                          key={subject.id}
                          className="rounded-md border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900"
                        >
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={!!assignment}
                              onChange={() => toggleSubject(subject)}
                              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                            />
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                              {subjectLabel(subject, t)}
                            </span>
                          </label>
                          {assignment && (
                            <div className="mt-2 grid gap-2 sm:grid-cols-2">
                              <Select
                                label={t("fromYear")}
                                value={String(assignment.gradeFrom)}
                                options={gradeOptions(subject.level, t)}
                                onChange={(e) =>
                                  updateAssignment(
                                    subject.id,
                                    "gradeFrom",
                                    Number(e.target.value)
                                  )
                                }
                              />
                              <Select
                                label={t("toYear")}
                                value={String(assignment.gradeTo)}
                                options={gradeOptions(subject.level, t)}
                                onChange={(e) =>
                                  updateAssignment(
                                    subject.id,
                                    "gradeTo",
                                    Number(e.target.value)
                                  )
                                }
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {filteredSubjects.length === 0 && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {t("noSubjectsForStage")}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t("selectLevelToShowSubjects")}
                </p>
              )}
            </div>
          </div>

          <Button type="submit">
            {editingId ? t("update") : t("createTeacher")}
          </Button>
        </form>
      )}

      <Table
        columns={[
          { key: "name", header: t("name") },
          { key: "email", header: t("email") },
          {
            key: "subjects",
            header: t("subjects"),
            render: (row: Teacher) =>
              row.subjectAssignments && row.subjectAssignments.length > 0
                ? row.subjectAssignments
                    .map(
                      (a) =>
                        `${getSubjectName(a.subjectId)} (${a.gradeFrom}-${a.gradeTo})`
                    )
                    .join(", ")
                : t("none"),
          },
          {
            key: "actions",
            header: t("actions"),
            render: (row: Teacher) => (
              <div className="flex gap-2">
                <Button
                  href={`/center/teachers/${row.id}`}
                  size="sm"
                  variant="outline"
                >
                  {t("profile")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => startEdit(row)}
                >
                  {t("edit")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(row)}
                >
                  {t("delete")}
                </Button>
              </div>
            ),
          },
        ]}
        rows={teachers}
        keyExtractor={(row) => row.id}
      />
    </div>
  );
}
