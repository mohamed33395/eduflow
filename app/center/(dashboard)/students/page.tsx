"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  MoreVertical,
  Pencil,
  Phone,
  Search,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { useAuth } from "@/app/hooks/useAuth";
import { getStudents } from "@/app/services/students";
import { getClasses } from "@/app/services/classes";
import { getTeachers } from "@/app/services/teachers";
import { getSubjects } from "@/app/services/subjects";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Select } from "@/app/components/ui/select";
import { Badge } from "@/app/components/ui/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/app/components/ui/avatar";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/app/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { useI18n } from "@/app/lib/i18n/client";
import type {
  Student,
  Class,
  Teacher,
  Subject,
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
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [settings, setSettings] = useState<CenterSettings | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
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
    getSubjects({ centerId })
      .then(setSubjects)
      .catch(() => setSubjects([]));
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
    setEditingId(null);
  };

  const startEdit = (row: Student) => {
    setForm({
      name: row.name,
      phone: row.phone ?? "",
      email: row.email ?? "",
      password: "",
      username: row.username ?? "",
      stage: row.level && row.grade ? `${row.level}:${row.grade}` : "",
      group: row.classId ?? "",
      teacher: row.teacherId ?? "",
      gender: row.gender ?? "male",
      parentName: row.parentName ?? "",
      parentPhone: row.parentPhone ?? "",
      avatarUrl: row.avatarUrl ?? "",
    });
    const next: Record<string, SubjectAssignment> = {};
    for (const a of row.subjectAssignments ?? []) next[a.subjectId] = a;
    setSubjectAssignments(next);
    const first = row.subjectAssignments?.[0];
    if (first && GRADES_BY_LEVEL[first.level]) {
      setSubjectLevel(first.level);
      setDefaultRange({
        from: Math.min(...row.subjectAssignments!.map((a) => a.gradeFrom)),
        to: Math.max(...row.subjectAssignments!.map((a) => a.gradeTo)),
      });
    } else {
      setSubjectLevel("");
      setDefaultRange({ from: 1, to: 1 });
    }
    setEditingId(row.id);
    setShowForm(true);
  };

  const handleDelete = async (row: Student) => {
    if (!window.confirm(t("confirmDelete"))) return;
    try {
      const res = await fetch(`/api/center/students/${row.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res
          .json()
          .catch(() => ({ error: t("failedToDeleteStudent") }));
        setError(data.error || t("failedToDeleteStudent"));
        return;
      }
      setStudents((prev) => prev.filter((s) => s.id !== row.id));
    } catch (err) {
      console.error("[CenterStudentsPage] delete student failed:", err);
      setError(t("failedToDeleteStudent"));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
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
        allStudents.some(
          (s) =>
            s.id !== editingId &&
            s.email?.trim().toLowerCase() === cleanEmail
        )
      ) {
        setError(t("emailAlreadyInUse"));
        return;
      }

      const assignments = Object.values(subjectAssignments);
      const subjectIds = assignments.map((a) => a.subjectId);

      const res = await fetch(
        editingId ? `/api/center/students/${editingId}` : "/api/center/students",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            name: cleanName,
            phone: cleanPhone,
            email: cleanEmail,
            password: form.password || undefined,
            parentName: form.parentName.trim(),
            parentPhone: cleanParentPhone,
            level: selectedStage?.level,
            grade: selectedStage?.grade,
            classId: form.group || (editingId ? null : undefined),
            teacherId: form.teacher || (editingId ? null : undefined),
            gender: form.gender,
            courses: subjectIds,
            subjectIds,
            subjectAssignments: assignments,
            avatarUrl: form.avatarUrl,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({
          error: editingId
            ? t("failedToUpdateStudent")
            : t("failedToAddStudent"),
        }));
        setError(
          data.error ||
            (editingId ? t("failedToUpdateStudent") : t("failedToAddStudent"))
        );
        return;
      }

      const { student } = (await res.json()) as { student: Student };

      setStudents((prev) =>
        editingId
          ? prev.map((s) => (s.id === student.id ? student : s))
          : [...prev, student]
      );
      setShowForm(false);
      resetForm();
    } catch (err) {
      console.error("[CenterStudentsPage] save student failed:", err);
      setError(editingId ? t("failedToUpdateStudent") : t("failedToAddStudent"));
    }
  };

  const teacherNameById = useMemo(
    () => Object.fromEntries(teachers.map((tch) => [tch.id, tch.name])),
    [teachers]
  );

  const subjectNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of settings?.subjects ?? []) map[s.id] = s.name;
    for (const y of settings?.years ?? [])
      for (const s of y.subjects ?? []) map[s.id] = map[s.id] ?? s.name;
    for (const s of subjects) map[s.id] = map[s.id] ?? s.name;
    return map;
  }, [settings, subjects]);

  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.phone ?? "").includes(q) ||
        (s.username ?? "").toLowerCase().includes(q) ||
        (s.email ?? "").toLowerCase().includes(q)
    );
  }, [students, search]);

  const classGroups = useMemo(() => {
    const byId = new Map<string, Student[]>();
    for (const s of filteredStudents) {
      const key = s.classId || "__none__";
      const arr = byId.get(key) ?? [];
      arr.push(s);
      byId.set(key, arr);
    }
    const orderedClasses = [...classes].sort((a, b) =>
      a.name.localeCompare(b.name, "ar")
    );
    return { orderedClasses, byId, unassigned: byId.get("__none__") ?? [] };
  }, [filteredStudents, classes]);

  const getSubjectName = (id: string) => subjectNameById[id] ?? id;

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
          {showForm ? t("cancel") : t("addStudent")}
        </Button>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {showForm && (
        <FormShell
          editing={!!editingId}
          title={t("editStudent")}
          onClose={() => {
            setShowForm(false);
            resetForm();
          }}
        >
          <form
            onSubmit={handleSave}
            className={
              editingId
                ? "space-y-3"
                : "mx-auto w-full max-w-4xl space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900"
            }
          >
            {!editingId && (
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {t("addStudent")}
              </h2>
            )}
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
              required={!editingId}
              minLength={editingId ? 8 : 6}
              value={form.password}
              onChange={(e) =>
                setForm({ ...form, password: e.target.value })
              }
              placeholder={editingId ? t("leaveEmptyToKeepPassword") : undefined}
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
            <Button type="submit">
              {editingId ? t("update") : t("createAccount")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowForm(false);
                resetForm();
              }}
            >
              {t("cancel")}
            </Button>
          </div>
          </form>
        </FormShell>
      )}

      {/* tabs: one per class */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-auto w-full flex-wrap justify-end gap-1 bg-transparent p-0">
          <TabsTrigger value="all" className={TAB_TRIGGER_CLS}>
            {t("all")}
            <span className={TAB_COUNT_CLS}>{filteredStudents.length}</span>
          </TabsTrigger>
          {classGroups.orderedClasses.map((c) => (
            <TabsTrigger key={c.id} value={c.id} className={TAB_TRIGGER_CLS}>
              {c.name}
              <span className={TAB_COUNT_CLS}>
                {classGroups.byId.get(c.id)?.length ?? 0}
              </span>
            </TabsTrigger>
          ))}
          {classGroups.unassigned.length > 0 && (
            <TabsTrigger value="__none__" className={TAB_TRIGGER_CLS}>
              {t("unassigned")}
              <span className={TAB_COUNT_CLS}>
                {classGroups.unassigned.length}
              </span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* search + count */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("searchByNameOrPhone")}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 ps-9 pe-3 text-sm shadow-sm outline-none placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <Badge variant="neutral" className="ms-auto px-3 py-1">
            {filteredStudents.length} {t("students")}
          </Badge>
        </div>

        <TabsContent value="all">
          <StudentList
            students={filteredStudents}
            emptyMsg={
              search.trim() ? t("noMatchSearch") : t("noStudentsYet")
            }
            t={t}
            getSubjectName={getSubjectName}
            onEdit={startEdit}
            onDelete={handleDelete}
          />
        </TabsContent>

        {classGroups.orderedClasses.map((c) => {
          const list = classGroups.byId.get(c.id) ?? [];
          const teacherNames = (c.teacherIds ?? [])
            .map((id) => teacherNameById[id])
            .filter(Boolean);
          return (
            <TabsContent key={c.id} value={c.id}>
              {/* class header */}
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Users className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      {c.name}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {c.level ? t(c.level) : ""}
                      {c.gradeFrom === c.gradeTo
                        ? ` · ${c.gradeFrom} ${t("year")}`
                        : ` · ${c.gradeFrom}–${c.gradeTo} ${t("year")}`}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {teacherNames.map((name) => (
                    <Badge key={name} variant="info">
                      {name}
                    </Badge>
                  ))}
                  {c.status !== "active" && (
                    <Badge variant="neutral">{t("inactive")}</Badge>
                  )}
                  <Badge variant="neutral">
                    {list.length} {t("students")}
                  </Badge>
                </div>
              </div>

              <StudentList
                students={list}
                emptyMsg={
                  search.trim() ? t("noMatchSearch") : t("noStudentsInGroup")
                }
                t={t}
                getSubjectName={getSubjectName}
                onEdit={startEdit}
                onDelete={handleDelete}
              />
            </TabsContent>
          );
        })}

        {classGroups.unassigned.length > 0 && (
          <TabsContent value="__none__">
            <StudentList
              students={classGroups.unassigned}
              emptyMsg={
                search.trim() ? t("noMatchSearch") : t("noStudentsInGroup")
              }
              t={t}
              getSubjectName={getSubjectName}
              onEdit={startEdit}
              onDelete={handleDelete}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

const TAB_TRIGGER_CLS =
  "rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm data-[state=active]:border-primary data-[state=active]:bg-primary data-[state=active]:text-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";

const TAB_COUNT_CLS =
  "ms-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs data-[state=active]:bg-white/25 dark:bg-slate-800";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
}

function StudentList({
  students,
  emptyMsg,
  t,
  getSubjectName,
  onEdit,
  onDelete,
}: {
  students: Student[];
  emptyMsg: string;
  t: (key: string, fallback?: string) => string;
  getSubjectName: (id: string) => string;
  onEdit: (s: Student) => void;
  onDelete: (s: Student) => void;
}) {
  if (!students.length) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 py-14 text-slate-400 dark:border-slate-700">
        <Users className="h-9 w-9" />
        <p className="text-sm font-medium">{emptyMsg}</p>
      </div>
    );
  }

  return (
    <div>
      {/* column headers */}
      <div className="hidden items-center gap-3 px-4 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 md:flex">
        <span className="w-10 shrink-0" />
        <span className="min-w-[10rem] flex-1">{t("name")}</span>
        <span className="w-28">{t("phone")}</span>
        <span className="w-20 text-center">{t("stage")}</span>
        <span className="w-16 text-center">{t("studentType")}</span>
        <span className="w-44">{t("subjects")}</span>
        <span className="w-20 text-center">{t("actions")}</span>
      </div>
      <ul className="space-y-2">
      {students.map((s) => {
        const stage =
          s.level && s.grade ? `${s.grade} ${t(s.level)}` : null;
        const subjects = (s.subjectAssignments ?? []).filter(
          (a) => getSubjectName(a.subjectId) !== a.subjectId
        );
        return (
          <li
            key={s.id}
            className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-colors hover:border-primary/40 dark:border-slate-800 dark:bg-slate-900"
          >
            <Avatar className="h-10 w-10">
              {s.avatarUrl && <AvatarImage src={s.avatarUrl} alt={s.name} />}
              <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
                {initials(s.name)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                {s.name}
              </p>
              {(s.email || s.username) && (
                <p className="truncate text-xs text-slate-500" dir="ltr">
                  {s.email || s.username}
                </p>
              )}
            </div>

            <span
              className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 md:w-28"
              dir="ltr"
            >
              {s.phone ? (
                <>
                  <Phone className="h-3.5 w-3.5" />
                  {s.phone}
                </>
              ) : (
                "—"
              )}
            </span>

            <span className="md:w-20 md:text-center">
              {stage ? (
                <Badge variant="info">{stage}</Badge>
              ) : (
                <span className="text-xs text-slate-400">—</span>
              )}
            </span>
            <span className="md:w-16 md:text-center">
              {s.gender ? (
                <Badge variant="neutral">{t(s.gender)}</Badge>
              ) : (
                <span className="text-xs text-slate-400">—</span>
              )}
            </span>

            <div className="flex flex-wrap items-center gap-1 md:w-44">
              {subjects.length > 0 ? (
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold leading-5 text-slate-600 transition-colors hover:border-primary/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {subjects.length} {t("subjects")}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" align="start" className="max-w-56">
                      <ul className="space-y-1 py-0.5">
                        {subjects.map((a) => (
                          <li key={a.subjectId}>
                            {getSubjectName(a.subjectId)}
                          </li>
                        ))}
                      </ul>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <span className="text-xs text-slate-400">—</span>
              )}
            </div>

            <span className="md:w-20 md:text-center">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 px-0"
                    aria-label={t("actions")}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/center/students/${s.id}`}>
                      <User className="h-4 w-4" />
                      {t("profile")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => onEdit(s)}>
                    <Pencil className="h-4 w-4" />
                    {t("edit")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => onDelete(s)}
                    className="text-red-600 focus:bg-red-50 dark:text-red-400 dark:focus:bg-red-950/50"
                  >
                    <Trash2 className="h-4 w-4" />
                    {t("delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </span>
          </li>
        );
      })}
    </ul>
    </div>
  );
}

function FormShell({
  editing,
  title,
  onClose,
  children,
  maxWidth = "max-w-2xl",
}: {
  editing: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  if (!editing) return <>{children}</>;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className={`max-h-[85vh] overflow-y-auto ${maxWidth}`}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
