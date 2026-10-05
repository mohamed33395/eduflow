"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/app/hooks/useAuth";
import { getStudents } from "@/app/services/students";
import { getClasses } from "@/app/services/classes";
import { getTeachers } from "@/app/services/teachers";
import { Table } from "@/app/components/ui/table";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Select } from "@/app/components/ui/select";
import { useI18n } from "@/app/lib/i18n/client";
import type {
  Student,
  Class,
  Teacher,
  EducationLevel,
  CenterSettings,
  CenterSubject,
  SubjectAssignment,
} from "@/app/types";

const STAGE_OPTIONS = [
  ...[1, 2, 3, 4, 5, 6].map((g) => ({
    value: `primary:${g}`,
    label: `${g} ابتدائي`,
    level: "primary" as EducationLevel,
    grade: g,
  })),
  ...[1, 2, 3].map((g) => ({
    value: `middle:${g}`,
    label: `${g} إعدادي`,
    level: "middle" as EducationLevel,
    grade: g,
  })),
  ...[1, 2, 3].map((g) => ({
    value: `high:${g}`,
    label: `${g} ثانوي`,
    level: "high" as EducationLevel,
    grade: g,
  })),
];

const GRADES_BY_LEVEL: Record<EducationLevel, number[]> = {
  kindergarten: [1, 2],
  primary: [1, 2, 3, 4, 5, 6],
  middle: [1, 2, 3],
  high: [1, 2, 3],
};

function getStage(level: EducationLevel, grade: number) {
  return STAGE_OPTIONS.find((s) => s.level === level && s.grade === grade);
}

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

export default function CenterStudentsPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const centerId = user?.centerId ?? "";

  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [settings, setSettings] = useState<CenterSettings | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    username: "",
    stage: "",
    group: "",
    teacher: "",
    gender: "male" as "male" | "female",
    parentName: "",
    parentPhone: "",
    avatarUrl: "",
  });
  const [subjectAssignments, setSubjectAssignments] = useState<
    Record<string, SubjectAssignment>
  >({});
  const [subjectLevel, setSubjectLevel] = useState<EducationLevel | "">("");
  const [defaultRange, setDefaultRange] = useState<{ from: number; to: number }>({
    from: 1,
    to: 1,
  });

  useEffect(() => {
    if (!centerId) return;
    getStudents(centerId).then(setStudents);
    getClasses(centerId).then(setClasses);
    getTeachers(centerId).then(setTeachers);
    fetch("/api/center/settings", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load settings");
        return res.json();
      })
      .then((data: { settings: CenterSettings }) => setSettings(data.settings))
      .catch((err) => console.error("[CenterStudentsPage] settings load:", err));
  }, [centerId]);

  const selectedStage = useMemo(
    () => STAGE_OPTIONS.find((s) => s.value === form.stage),
    [form.stage]
  );

  const groupOptions = useMemo(() => {
    const opts = [{ value: "", label: t("selectGroup") }];
    if (!selectedStage) return opts;
    const matching = classes.filter(
      (c) =>
        c.level === selectedStage.level &&
        selectedStage.grade >= c.gradeFrom &&
        selectedStage.grade <= c.gradeTo
    );
    opts.push(...matching.map((c) => ({ value: c.id, label: c.name })));
    return opts;
  }, [classes, selectedStage, t]);

  const teacherOptions = useMemo(() => {
    const opts = [{ value: "", label: t("selectTeacher") }];
    let list = teachers;
    if (form.group) {
      const group = classes.find((c) => c.id === form.group);
      if (group?.teacherIds?.length) {
        list = teachers.filter((teacher) =>
          group.teacherIds?.includes(teacher.id)
        );
      }
    }
    opts.push(...list.map((teacher) => ({ value: teacher.id, label: teacher.name })));
    return opts;
  }, [teachers, classes, form.group, t]);

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
    setForm({
      name: "",
      phone: "",
      email: "",
      password: "",
      username: "",
      stage: "",
      group: "",
      teacher: "",
      gender: "male" as "male" | "female",
      parentName: "",
      parentPhone: "",
      avatarUrl: "",
    });
    setSubjectAssignments({});
    setSubjectLevel("");
    setDefaultRange({ from: 1, to: 1 });
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!centerId) return;
    setError("");

    const cleanEmail = form.email.trim().toLowerCase();
    const cleanPhone = form.phone.trim();
    const cleanParentPhone = form.parentPhone.trim();
    const cleanName = form.name.trim();

    try {
      const allStudents = await getStudents(centerId);
      if (
        allStudents.some((s) => s.email?.trim().toLowerCase() === cleanEmail)
      ) {
        setError(t("emailAlreadyInUse"));
        return;
      }

      const assignments = Object.values(subjectAssignments);
      const subjectIds = assignments.map((a) => a.subjectId);

      const res = await fetch("/api/center/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: cleanName,
          phone: cleanPhone,
          email: cleanEmail,
          password: form.password,
          parentName: form.parentName.trim(),
          parentPhone: cleanParentPhone,
          level: selectedStage?.level,
          grade: selectedStage?.grade,
          classId: form.group || undefined,
          teacherId: form.teacher || undefined,
          gender: form.gender,
          courses: subjectIds,
          subjectIds,
          subjectAssignments: assignments,
          avatarUrl: form.avatarUrl,
        }),
      });

      if (!res.ok) {
        const data = await res
          .json()
          .catch(() => ({ error: t("failedToAddStudent") }));
        setError(data.error || t("failedToAddStudent"));
        return;
      }

      const { student } = (await res.json()) as { student: Student };

      setStudents((prev) => [...prev, student]);
      setShowForm(false);
      resetForm();
    } catch (err) {
      console.error("[CenterStudentsPage] add student failed:", err);
      setError(t("failedToAddStudent"));
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
          {t("students")}
        </h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? t("cancel") : t("addStudent")}
        </Button>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {showForm && (
        <form
          onSubmit={handleAdd}
          className="mx-auto w-full max-w-4xl space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label={t("fullName")}
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <Input
              label={t("phone")}
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <Input
              label={t("email")}
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              onBlur={() =>
                setForm((f) => ({ ...f, email: f.email.trim().toLowerCase() }))
              }
            />
            <Input
              label={t("password")}
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) =>
                setForm({ ...form, password: e.target.value })
              }
            />
            <Select
              label={t("stage")}
              required
              value={form.stage}
              options={[
                { value: "", label: t("selectStage") },
                ...STAGE_OPTIONS.map((s) => ({
                  value: s.value,
                  label: s.label,
                })),
              ]}
              onChange={(e) => {
                const nextStage = e.target.value;
                const stage = STAGE_OPTIONS.find((s) => s.value === nextStage);
                setForm({
                  ...form,
                  stage: nextStage,
                  group: "",
                  teacher: "",
                });
                if (stage) {
                  handleLevelChange(stage.level);
                }
              }}
            />

            <div className="sm:col-span-2">
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

            <Select
              label={t("group")}
              value={form.group}
              options={groupOptions}
              onChange={(e) =>
                setForm({ ...form, group: e.target.value, teacher: "" })
              }
            />
            <Select
              label={t("teacher")}
              value={form.teacher}
              options={teacherOptions}
              onChange={(e) => setForm({ ...form, teacher: e.target.value })}
            />
            <Select
              label={t("studentType")}
              value={form.gender}
              options={[
                { value: "male", label: t("male") },
                { value: "female", label: t("female") },
              ]}
              onChange={(e) =>
                setForm({
                  ...form,
                  gender: e.target.value as "male" | "female",
                })
              }
            />
            <Input
              label={t("parentName")}
              value={form.parentName}
              onChange={(e) =>
                setForm({ ...form, parentName: e.target.value })
              }
            />
            <Input
              label={t("parentPhone")}
              type="tel"
              value={form.parentPhone}
              onChange={(e) =>
                setForm({ ...form, parentPhone: e.target.value })
              }
            />
            <Input
              label={t("avatarUrl")}
              type="url"
              value={form.avatarUrl}
              onChange={(e) =>
                setForm({ ...form, avatarUrl: e.target.value })
              }
              placeholder="https://..."
            />
          </div>
          <div className="flex gap-3">
            <Button type="submit">{t("createAccount")}</Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowForm(false)}
            >
              {t("cancel")}
            </Button>
          </div>
        </form>
      )}

      <Table
        columns={[
          { key: "name", header: t("name") },
          { key: "phone", header: t("phone") },
          {
            key: "stage",
            header: t("stage"),
            render: (row: Student) =>
              row.level && row.grade
                ? getStage(row.level, row.grade)?.label ?? "-"
                : "-",
          },
          {
            key: "subjects",
            header: t("subjects"),
            render: (row: Student) =>
              row.subjectAssignments && row.subjectAssignments.length > 0
                ? row.subjectAssignments
                    .map(
                      (a) =>
                        `${getSubjectName(a.subjectId)} (${a.gradeFrom}-${a.gradeTo})`
                    )
                    .join(", ")
                : "-",
          },
          {
            key: "gender",
            header: t("studentType"),
            render: (row: Student) => (row.gender ? t(row.gender) : "-"),
          },
          {
            key: "actions",
            header: t("actions"),
            render: (row: Student) => (
              <Button
                href={`/center/students/${row.id}`}
                size="sm"
                variant="outline"
              >
                {t("profile")}
              </Button>
            ),
          },
        ]}
        rows={students}
        keyExtractor={(row) => row.id}
      />
    </div>
  );
}
