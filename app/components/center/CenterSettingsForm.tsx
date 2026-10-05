"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/app/components/ui/input";
import { Select } from "@/app/components/ui/select";
import { Button } from "@/app/components/ui/button";
import { useI18n } from "@/app/lib/i18n/client";
import { cn } from "@/app/lib/utils";
import { Pencil, Trash2 } from "lucide-react";
import type { CenterSettings, CenterYearPackage, EducationLevel } from "@/app/types";

const defaultSettings: CenterSettings = {
  subjects: [],
  maxStudentsPerClass: 0,
  groupsPerYear: [],
};

const LEVEL_OPTIONS: { value: EducationLevel; label: string }[] = [
  { value: "kindergarten", label: "Kindergarten" },
  { value: "primary", label: "Primary" },
  { value: "middle", label: "Middle School" },
  { value: "high", label: "High School" },
];

const TRACK_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "general" },
  { value: "scientific", label: "scientific" },
  { value: "literary", label: "literary" },
  { value: "practicalSports", label: "practicalSports" },
  { value: "practicalSciences", label: "practicalSciences" },
];

interface CenterSettingsFormProps {
  centerId: string;
  endpoint: string;
}

export function CenterSettingsForm({ centerId, endpoint }: CenterSettingsFormProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [settings, setSettings] = useState<CenterSettings>(defaultSettings);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedYearId, setSelectedYearId] = useState<string | null>(null);
  const [yearMeta, setYearMeta] = useState({
    level: "primary" as EducationLevel,
    grade: 1,
    track: "",
    teacher: "",
  });

  useEffect(() => {
    if (!centerId) {
      setFetching(false);
      return;
    }
    fetch(endpoint, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || t("failedToLoadCenterSettings"));
        }
        return res.json();
      })
      .then((data: { settings: CenterSettings }) => {
        setSettings({
          ...defaultSettings,
          ...data.settings,
          subjects: data.settings?.subjects?.length
            ? data.settings.subjects
            : [],
          groupsPerYear: data.settings?.groupsPerYear?.length
            ? data.settings.groupsPerYear
            : [],
          years: data.settings?.years?.length ? data.settings.years : [],
        });
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : t("failedToLoadCenterSettings"));
      })
      .finally(() => setFetching(false));
  }, [centerId, endpoint, t]);

  const subjectsTotal = useMemo(
    () => settings.subjects.reduce((sum, s) => sum + (Number(s.price) || 0), 0),
    [settings.subjects]
  );

  const sortedYears = useMemo(
    () =>
      [...(settings.years || [])].sort((a, b) => {
        const levelOrder = ["kindergarten", "primary", "middle", "high"];
        const aIndex = levelOrder.indexOf(a.level);
        const bIndex = levelOrder.indexOf(b.level);
        if (aIndex !== bIndex) return aIndex - bIndex;
        return a.grade - b.grade;
      }),
    [settings.years]
  );

  const addSubject = () => {
    setSettings((prev) => ({
      ...prev,
      subjects: [
        ...prev.subjects,
        {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          level: "primary" as EducationLevel,
          grade: 1,
          name: "",
          price: 0,
        },
      ],
    }));
  };

  const updateSubject = (index: number, patch: Partial<CenterSettings["subjects"][number]>) => {
    setSettings((prev) => ({
      ...prev,
      subjects: prev.subjects.map((s, i) => {
        if (i !== index) return s;
        const next = { ...s, ...patch };
        if (next.grade !== undefined) next.grade = Math.max(1, Number(next.grade) || 0);
        if (next.price !== undefined) next.price = Number(next.price) || 0;
        if ("track" in patch && (patch.track === "" || patch.track === undefined)) {
          next.track = undefined;
        }
        return next;
      }),
    }));
  };

  const removeSubject = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      subjects: prev.subjects.filter((_, i) => i !== index),
    }));
  };

  const GRADES_BY_LEVEL: Record<EducationLevel, number[]> = {
    kindergarten: [1, 2],
    primary: [1, 2, 3, 4, 5, 6],
    middle: [1, 2, 3],
    high: [1, 2, 3],
  };

  const getSubjectGroupYears = (
    level: EducationLevel,
    grade: number,
    track?: string
  ): { level: EducationLevel; grade: number; track?: string }[] => {
    if (level === "primary" && grade >= 1 && grade <= 3) {
      return [1, 2, 3].map((g) => ({ level: "primary" as EducationLevel, grade: g }));
    }
    if (
      (level === "primary" && grade >= 4 && grade <= 6) ||
      (level === "middle" && grade >= 1 && grade <= 3)
    ) {
      return [
        ...[4, 5, 6].map((g) => ({ level: "primary" as EducationLevel, grade: g })),
        ...[1, 2, 3].map((g) => ({ level: "middle" as EducationLevel, grade: g })),
      ];
    }
    if (level === "high") {
      return [{ level: "high" as EducationLevel, grade, track }];
    }
    return [{ level, grade, track }];
  };

  const [quickLevel, setQuickLevel] = useState<EducationLevel | "all">("all");
  const [quickCount, setQuickCount] = useState<number>(1);

  const addGroup = () => {
    setSettings((prev) => ({
      ...prev,
      groupsPerYear: [
        ...prev.groupsPerYear,
        { level: "primary" as EducationLevel, grade: 1, count: 1 },
      ],
    }));
  };

  const updateGroup = (
    index: number,
    patch: Partial<CenterSettings["groupsPerYear"][number]>
  ) => {
    setSettings((prev) => ({
      ...prev,
      groupsPerYear: prev.groupsPerYear.map((g, i) => {
        if (i !== index) return g;
        const next = { ...g, ...patch };
        if (next.grade !== undefined)
          next.grade = Math.max(1, Number(next.grade) || 0);
        if (next.count !== undefined)
          next.count = Math.max(0, Number(next.count) || 0);
        return next;
      }),
    }));
  };

  const removeGroup = (index: number) => {
    setSettings((prev) => ({
      ...prev,
      groupsPerYear: prev.groupsPerYear.filter((_, i) => i !== index),
    }));
  };

  const applyToLevel = () => {
    setSettings((prev) => {
      const levels: EducationLevel[] =
        quickLevel === "all" ? ["kindergarten", "primary", "middle", "high"] : [quickLevel];

      const next = [...prev.groupsPerYear];

      for (const level of levels) {
        const years = GRADES_BY_LEVEL[level];
        for (const year of years) {
          const existing = next.findIndex((g) => g.level === level && g.grade === year);
          if (existing >= 0) {
            next[existing] = { ...next[existing], count: quickCount };
          } else {
            next.push({ level, grade: year, count: quickCount });
          }
        }
      }

      next.sort((a, b) => {
        const levelOrder = ["kindergarten", "primary", "middle", "high"];
        const aIndex = levelOrder.indexOf(a.level);
        const bIndex = levelOrder.indexOf(b.level);
        if (aIndex !== bIndex) return aIndex - bIndex;
        return a.grade - b.grade;
      });

      return { ...prev, groupsPerYear: next };
    });
  };

  const buildYearPackageFor = (
    year: { level: EducationLevel; grade: number; track?: string },
    existing: CenterYearPackage | undefined,
    base: CenterSettings,
    isSelected: boolean
  ): CenterYearPackage => {
    const id = existing?.id ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return {
      id,
      level: year.level,
      grade: year.grade,
      track: year.track || undefined,
      teacher: isSelected ? yearMeta.teacher : (existing?.teacher ?? yearMeta.teacher),
      subjects: base.subjects.map((s) => ({
        ...s,
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        level: year.level,
        grade: year.grade,
        track: year.track || undefined,
      })),
      bundlePrice: base.bundlePrice,
      maxStudentsPerClass: isSelected
        ? base.maxStudentsPerClass
        : (existing?.maxStudentsPerClass ?? base.maxStudentsPerClass),
      groupsPerYear: isSelected
        ? base.groupsPerYear.map((g) => ({
            ...g,
            level: year.level,
            grade: year.grade,
          }))
        : (existing?.groupsPerYear ??
          base.groupsPerYear.map((g) => ({
            ...g,
            level: year.level,
            grade: year.grade,
          }))),
    };
  };

  const yearPackageKey = (
    level: EducationLevel,
    grade: number,
    track?: string
  ) => `${level}:${grade}:${track ?? ""}`;

  const applyYear = () => {
    const groupYears = getSubjectGroupYears(yearMeta.level, yearMeta.grade, yearMeta.track);

    let selectedYearPackageId: string | null = null;

    setSettings((prev) => {
      const nextYears: CenterYearPackage[] = [...(prev.years || [])];
      const existingByKey = new Map<string, CenterYearPackage>();
      nextYears.forEach((y) =>
        existingByKey.set(yearPackageKey(y.level, y.grade, y.track), y)
      );

      for (const year of groupYears) {
        const key = yearPackageKey(year.level, year.grade, year.track);
        const existing = existingByKey.get(key);
        const isSelected =
          year.level === yearMeta.level &&
          year.grade === yearMeta.grade &&
          (year.track ?? "") === (yearMeta.track || "");

        if (!isSelected && existing) continue;

        const updated = buildYearPackageFor(year, existing, prev, isSelected);
        if (existing) {
          const idx = nextYears.findIndex(
            (y) => yearPackageKey(y.level, y.grade, y.track) === key
          );
          if (idx >= 0) nextYears[idx] = updated;
        } else {
          nextYears.push(updated);
        }
        existingByKey.set(key, updated);
      }

      nextYears.sort((a, b) => {
        const levelOrder = ["kindergarten", "primary", "middle", "high"];
        const aIndex = levelOrder.indexOf(a.level);
        const bIndex = levelOrder.indexOf(b.level);
        if (aIndex !== bIndex) return aIndex - bIndex;
        return a.grade - b.grade;
      });

      const selectedTarget = groupYears.find(
        (y) =>
          y.level === yearMeta.level &&
          y.grade === yearMeta.grade &&
          (y.track ?? "") === (yearMeta.track || "")
      );
      const selectedPackage = selectedTarget
        ? existingByKey.get(
            yearPackageKey(selectedTarget.level, selectedTarget.grade, selectedTarget.track)
          )
        : undefined;
      selectedYearPackageId = selectedPackage?.id ?? null;

      return { ...prev, years: nextYears };
    });

    setSelectedYearId(selectedYearPackageId);
    setSuccess(t("yearApplied"));
  };

  const editYear = (yearId: string) => {
    const year = settings.years?.find((y) => y.id === yearId);
    if (!year) return;
    setSelectedYearId(year.id);
    setYearMeta({
      level: year.level,
      grade: year.grade,
      track: year.track ?? "",
      teacher: year.teacher ?? "",
    });
    setSettings((prev) => ({
      ...prev,
      subjects: year.subjects.map((s) => ({ ...s })),
      bundlePrice: year.bundlePrice,
      maxStudentsPerClass: year.maxStudentsPerClass,
      groupsPerYear: year.groupsPerYear.map((g) => ({ ...g })),
    }));
  };

  const deleteYear = (yearId: string) => {
    setSettings((prev) => ({
      ...prev,
      years: (prev.years || []).filter((y) => y.id !== yearId),
    }));
    if (selectedYearId === yearId) {
      setSelectedYearId(null);
      setYearMeta({
        level: "primary" as EducationLevel,
        grade: 1,
        track: "",
        teacher: "",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!centerId) return;
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || t("failedToUpdateCenterSettings"));
      }
      setSuccess(t("settingsSaved"));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("failedToUpdateCenterSettings"));
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <p className="text-slate-500">{t("loading")}</p>;
  }

  return (
    <div className="max-w-5xl">
      <h1 className="mb-6 text-2xl font-bold text-slate-900 dark:text-white">
        {t("centerSettings")}
      </h1>
      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
      {success && <p className="mb-4 text-sm text-green-600">{success}</p>}

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-col flex-wrap items-start justify-between gap-4 sm:flex-row sm:items-center">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t("curriculum")}
          </h2>
          {sortedYears.length ? (
            <div className="flex flex-wrap gap-2">
              {sortedYears.map((year) => (
                <div
                  key={year.id}
                  onClick={() => editYear(year.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      editYear(year.id);
                    }
                  }}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                    selectedYearId === year.id
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950 dark:text-indigo-300"
                      : "cursor-pointer border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  )}
                >
                  <span className="min-w-0 truncate">
                    {t(year.level)} {t("year")} {year.grade}
                    {year.track ? ` - ${t(year.track)}` : ""}
                  </span>
                  <div className="flex items-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteYear(year.id);
                      }}
                    >
                      <Trash2 size={16} className="text-red-600" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="px-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        editYear(year.id);
                      }}
                    >
                      <Pencil size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500">{t("noYearsAdded")}</p>
          )}
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-8">
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t("year")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr,1fr,1fr,1fr,auto] items-end">
            <Select
              label={t("level")}
              value={yearMeta.level}
              options={LEVEL_OPTIONS.map((l) => ({
                value: l.value,
                label: t(l.value),
              }))}
              onChange={(e) =>
                setYearMeta((prev) => ({
                  ...prev,
                  level: e.target.value as EducationLevel,
                }))
              }
            />
            <Input
              label={t("year")}
              type="number"
              min={1}
              required
              value={yearMeta.grade}
              onChange={(e) =>
                setYearMeta((prev) => ({
                  ...prev,
                  grade: Math.max(1, Number(e.target.value) || 0),
                }))
              }
            />
            <Select
              label={t("track")}
              value={yearMeta.track}
              options={TRACK_OPTIONS.map((option) => ({
                value: option.value,
                label: t(option.label),
              }))}
              onChange={(e) =>
                setYearMeta((prev) => ({ ...prev, track: e.target.value }))
              }
            />
            <Input
              label={t("teacherName")}
              value={yearMeta.teacher}
              onChange={(e) =>
                setYearMeta((prev) => ({ ...prev, teacher: e.target.value }))
              }
            />
            <Button type="button" variant="secondary" onClick={applyYear}>
              {getSubjectGroupYears(yearMeta.level, yearMeta.grade, yearMeta.track).length > 1
                ? t("applyToGroup")
                : t("applyToYear")}
            </Button>
          </div>
          <p className="text-sm text-slate-500">
            {t("autoAppliesTo")}: { " " }
            {getSubjectGroupYears(yearMeta.level, yearMeta.grade, yearMeta.track)
              .map(
                (y) =>
                  `${t(y.level)} ${t("year")} ${y.grade}${
                    y.track ? ` - ${t(y.track)}` : ""
                  }`
              )
              .join("، ")}
          </p>
        </section>

        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t("subjects")}
          </h2>

          <div className="space-y-4">
            {settings.subjects.map((subject, idx) => (
              <div
                key={subject.id}
                className="grid gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900 sm:grid-cols-2 lg:grid-cols-[1fr,1fr,1fr,1fr,1fr,auto] items-end"
              >
                <Select
                  label={t("level")}
                  value={subject.level}
                  options={LEVEL_OPTIONS.map((l) => ({
                    value: l.value,
                    label: t(l.value),
                  }))}
                  onChange={(e) =>
                    updateSubject(idx, {
                      level: e.target.value as EducationLevel,
                    })
                  }
                />
                <Input
                  label={t("year")}
                  type="number"
                  min={1}
                  required
                  value={subject.grade}
                  onChange={(e) =>
                    updateSubject(idx, { grade: Number(e.target.value) })
                  }
                />
                <Select
                  label={t("track")}
                  value={subject.track ?? ""}
                  options={TRACK_OPTIONS.map((option) => ({
                    value: option.value,
                    label: t(option.label),
                  }))}
                  onChange={(e) =>
                    updateSubject(idx, {
                      track: e.target.value || undefined,
                    })
                  }
                />
                <Input
                  label={t("subjectName")}
                  required
                  value={subject.name}
                  onChange={(e) =>
                    updateSubject(idx, { name: e.target.value })
                  }
                />
                <Input
                  label={t("subjectPrice")}
                  type="number"
                  min={0}
                  required
                  value={subject.price}
                  onChange={(e) =>
                    updateSubject(idx, { price: Number(e.target.value) })
                  }
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => removeSubject(idx)}
                >
                  {t("remove")}
                </Button>
              </div>
            ))}
          </div>

          <Button type="button" variant="secondary" onClick={addSubject}>
            {t("addSubject")}
          </Button>

          <div className="grid gap-4 sm:grid-cols-2 border-t border-slate-100 pt-4">
            <Input
              label={t("bundlePrice")}
              type="number"
              min={0}
              value={settings.bundlePrice ?? ""}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  bundlePrice:
                    e.target.value === ""
                      ? undefined
                      : Math.max(0, Number(e.target.value) || 0),
                }))
              }
            />
            <div className="flex flex-col justify-center rounded-lg bg-slate-50 p-3 dark:bg-slate-900">
              <span className="text-sm text-slate-500">{t("subjectsTotal")}</span>
              <span className="text-lg font-semibold text-slate-900 dark:text-white">
                {subjectsTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t("classSettings")}
          </h2>
          <Input
            label={t("maxStudentsPerClass")}
            type="number"
            min={0}
            required
            value={settings.maxStudentsPerClass}
            onChange={(e) =>
              setSettings((prev) => ({
                ...prev,
                maxStudentsPerClass: Math.max(0, Number(e.target.value) || 0),
              }))
            }
          />
        </section>

        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {t("groupsPerYear")}
          </h2>

          <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-900">
            <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
              {t("applyToAllLevels")}
            </p>
            <div className="grid gap-3 sm:grid-cols-[1fr,1fr,auto] items-end">
              <Select
                label={t("level")}
                value={quickLevel}
                options={[
                  { value: "all", label: t("allLevels") },
                  ...LEVEL_OPTIONS.map((l) => ({
                    value: l.value,
                    label: t(l.value),
                  })),
                ]}
                onChange={(e) =>
                  setQuickLevel(e.target.value as EducationLevel | "all")
                }
              />
              <Input
                label={t("groupCount")}
                type="number"
                min={0}
                value={quickCount}
                onChange={(e) =>
                  setQuickCount(Math.max(0, Number(e.target.value) || 0))
                }
              />
              <Button type="button" variant="secondary" onClick={applyToLevel}>
                {t("apply")}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {settings.groupsPerYear.map((group, idx) => (
              <div
                key={idx}
                className="grid gap-3 sm:grid-cols-[1fr,1fr,1fr,auto] items-end"
              >
                <Select
                  label={t("level")}
                  value={group.level}
                  options={LEVEL_OPTIONS.map((l) => ({
                    value: l.value,
                    label: t(l.value),
                  }))}
                  onChange={(e) =>
                    updateGroup(idx, { level: e.target.value as EducationLevel })
                  }
                />
                <Input
                  label={t("year")}
                  type="number"
                  min={1}
                  required
                  value={group.grade}
                  onChange={(e) =>
                    updateGroup(idx, { grade: Number(e.target.value) })
                  }
                />
                <Input
                  label={t("groupCount")}
                  type="number"
                  min={0}
                  required
                  value={group.count}
                  onChange={(e) =>
                    updateGroup(idx, { count: Number(e.target.value) })
                  }
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => removeGroup(idx)}
                >
                  {t("remove")}
                </Button>
              </div>
            ))}
          </div>

          <Button type="button" variant="secondary" onClick={addGroup}>
            {t("addGroup")}
          </Button>
        </section>

        <Button type="submit" disabled={loading}>
          {loading ? t("saving") : t("saveChanges")}
        </Button>
      </form>
    </div>
  );
}
