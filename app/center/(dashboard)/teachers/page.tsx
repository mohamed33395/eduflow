"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  MoreVertical,
  Pencil,
  Search,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { useAuth } from "@/app/hooks/useAuth";
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
  Teacher,
  Subject,
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
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [settings, setSettings] = useState<CenterSettings | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
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
    getSubjects({ centerId })
      .then(setSubjects)
      .catch(() => setSubjects([]));
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
            password: form.password || undefined,
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

  const subjectNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const s of settings?.subjects ?? []) map[s.id] = s.name;
    for (const y of settings?.years ?? [])
      for (const s of y.subjects ?? []) map[s.id] = map[s.id] ?? s.name;
    for (const s of subjects) map[s.id] = map[s.id] ?? s.name;
    return map;
  }, [settings, subjects]);

  const filteredTeachers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter(
      (tch) =>
        tch.name.toLowerCase().includes(q) ||
        (tch.email ?? "").toLowerCase().includes(q)
    );
  }, [teachers, search]);

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
        <FormShell
          editing={!!editingId}
          title={t("editTeacher")}
          maxWidth="max-w-lg"
          onClose={() => {
            setShowForm(false);
            resetForm();
          }}
        >
          <form
            onSubmit={handleSave}
            className={
              editingId
                ? "space-y-4"
                : "space-y-4 rounded-xl border border-slate-200 bg-white p-6"
            }
          >
            {!editingId && (
              <h2 className="text-lg font-semibold text-slate-900">
                {t("addTeacher")}
              </h2>
            )}
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
          <Input
            label={t("password")}
            type="password"
            required={!editingId}
            minLength={editingId ? 8 : 6}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            placeholder={editingId ? t("leaveEmptyToKeepPassword") : undefined}
          />
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
        </FormShell>
      )}

      {/* search + count */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("searchByNameOrEmail")}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 ps-9 pe-3 text-sm shadow-sm outline-none placeholder:text-slate-400 focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>
        <Badge variant="neutral" className="ms-auto px-3 py-1">
          {filteredTeachers.length} {t("teachers")}
        </Badge>
      </div>

      <TeacherList
        teachers={filteredTeachers}
        emptyMsg={search.trim() ? t("noMatchSearch") : t("noTeachersYet")}
        t={t}
        getSubjectName={getSubjectName}
        onEdit={startEdit}
        onDelete={handleDelete}
      />
    </div>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
}

const AVATAR_COLORS = [
  "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300",
  "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
  "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
  "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300",
  "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
];

function avatarColor(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function salaryLabel(tch: Teacher, t: (k: string) => string) {
  if (tch.compensationType === "fixed")
    return `${tch.fixedAmount ?? 0} ${t("fixed")}`;
  if (tch.compensationType === "percentage")
    return `${tch.commissionPercent ?? 0}% ${t("commission")}`;
  return "—";
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

function TeacherList({
  teachers,
  emptyMsg,
  t,
  getSubjectName,
  onEdit,
  onDelete,
}: {
  teachers: Teacher[];
  emptyMsg: string;
  t: (key: string, fallback?: string) => string;
  getSubjectName: (id: string) => string;
  onEdit: (teacher: Teacher) => void;
  onDelete: (teacher: Teacher) => void;
}) {
  if (!teachers.length) {
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
        <span className="w-64">{t("name")}</span>
        <span className="flex-1">{t("email")}</span>
        <span className="w-40">{t("subjects")}</span>
        <span className="w-40">{t("salary")}</span>
        <span className="w-16 text-center">{t("actions")}</span>
      </div>
      <ul className="space-y-2">
        {teachers.map((row) => {
          const subjects = (row.subjectAssignments ?? []).filter(
            (a) => getSubjectName(a.subjectId) !== a.subjectId
          );
          return (
            <li
              key={row.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition-colors hover:border-primary/40 hover:bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/40"
            >
              <Avatar className="h-10 w-10">
                {row.avatarUrl && (
                  <AvatarImage src={row.avatarUrl} alt={row.name} />
                )}
                <AvatarFallback
                  className={`text-sm font-bold ${avatarColor(row.name)}`}
                >
                  {initials(row.name)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1 md:w-64 md:flex-none">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {row.name}
                </p>
              </div>

              <span className="truncate text-xs text-slate-500 dark:text-slate-400 md:min-w-0 md:flex-1">
                {row.email || "—"}
              </span>

              <div className="flex flex-wrap items-center gap-1 md:w-40">
                {subjects.length > 0 ? (
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold leading-5 text-slate-600 transition-colors hover:border-primary/40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {subjects.length} {t("subjects")}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent
                        side="bottom"
                        align="start"
                        className="max-w-64"
                      >
                        <ul className="space-y-1 py-0.5">
                          {subjects.map((a) => (
                            <li
                              key={a.subjectId}
                              className="flex items-center justify-between gap-4"
                            >
                              <span>{getSubjectName(a.subjectId)}</span>
                              <span className="text-xs text-slate-400">
                                {a.gradeFrom}–{a.gradeTo}
                              </span>
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

              <span className="text-xs text-slate-500 dark:text-slate-400 md:w-40">
                {salaryLabel(row, t)}
              </span>

              <div className="md:w-16 md:text-center">
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
                      <Link href={`/center/teachers/${row.id}`}>
                        <User className="h-4 w-4" />
                        {t("profile")}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => onEdit(row)}>
                      <Pencil className="h-4 w-4" />
                      {t("edit")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onSelect={() => onDelete(row)}
                      className="text-red-600 focus:bg-red-50 dark:text-red-400 dark:focus:bg-red-950/50"
                    >
                      <Trash2 className="h-4 w-4" />
                      {t("delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
