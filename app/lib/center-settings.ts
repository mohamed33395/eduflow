import { randomUUID } from "crypto";
import type {
  CenterSettings,
  CenterSubject,
  CenterGradeGroup,
  CenterYearPackage,
  EducationLevel,
} from "@/app/types";

export const ALLOWED_LEVELS: EducationLevel[] = [
  "kindergarten",
  "primary",
  "middle",
  "high",
];

export function sanitizeSubject(s: unknown): CenterSubject {
  const item = s as {
    id?: string;
    level?: string;
    grade?: unknown;
    track?: string;
    name?: string;
    price?: unknown;
  };
  const price =
    typeof item.price === "number" ? item.price : Number(item.price);
  const grade =
    typeof item.grade === "number" ? item.grade : Number(item.grade);
  const level = ALLOWED_LEVELS.includes(item.level as EducationLevel)
    ? (item.level as EducationLevel)
    : "primary";
  return {
    id: typeof item.id === "string" && item.id ? item.id : randomUUID(),
    level,
    grade: Number.isFinite(grade) && grade > 0 ? grade : 1,
    track:
      typeof item.track === "string" && item.track ? item.track : undefined,
    name: item.name || "",
    price: Number.isFinite(price) && price >= 0 ? price : 0,
  };
}

export function sanitizeGradeGroup(g: unknown): CenterGradeGroup {
  const item = g as {
    level: EducationLevel;
    grade: number;
    count?: unknown;
  };
  const count =
    typeof item.count === "number" ? item.count : Number(item.count);
  return {
    level: item.level,
    grade: Number.isFinite(item.grade) && item.grade > 0 ? item.grade : 1,
    count: Number.isFinite(count) && count >= 0 ? count : 0,
  };
}

export function sanitizeYearPackage(y: unknown): CenterYearPackage {
  const item = (y || {}) as Partial<CenterYearPackage>;
  const level = ALLOWED_LEVELS.includes(item.level as EducationLevel)
    ? (item.level as EducationLevel)
    : "primary";
  const grade =
    typeof item.grade === "number" ? item.grade : Number(item.grade);
  const subjects = Array.isArray(item.subjects)
    ? item.subjects
        .filter(
          (s: unknown) =>
            s && typeof (s as { name?: string }).name === "string"
        )
        .map(sanitizeSubject)
    : [];
  const groupsPerYear = Array.isArray(item.groupsPerYear)
    ? item.groupsPerYear
        .filter(
          (g: unknown) =>
            g &&
            ALLOWED_LEVELS.includes(
              (g as { level?: string }).level as EducationLevel
            ) &&
            typeof (g as { grade?: unknown }).grade === "number"
        )
        .map(sanitizeGradeGroup)
    : [];
  const bundlePriceRaw =
    typeof item.bundlePrice === "number"
      ? item.bundlePrice
      : Number(item.bundlePrice);
  const bundlePrice =
    item.bundlePrice === undefined
      ? undefined
      : Number.isFinite(bundlePriceRaw) && bundlePriceRaw >= 0
      ? bundlePriceRaw
      : undefined;
  const maxStudentsPerClass =
    typeof item.maxStudentsPerClass === "number"
      ? item.maxStudentsPerClass
      : Number(item.maxStudentsPerClass);
  return {
    id: typeof item.id === "string" && item.id ? item.id : randomUUID(),
    level,
    grade: Number.isFinite(grade) && grade > 0 ? grade : 1,
    track:
      typeof item.track === "string" && item.track ? item.track : undefined,
    teacher:
      typeof item.teacher === "string" && item.teacher
        ? item.teacher
        : undefined,
    subjects,
    bundlePrice,
    maxStudentsPerClass: Number.isFinite(maxStudentsPerClass)
      ? Math.max(0, maxStudentsPerClass)
      : 0,
    groupsPerYear,
  };
}

export function removeUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return (value as unknown[])
      .filter((item) => item !== undefined)
      .map((item) => removeUndefined(item)) as unknown as T;
  }
  if (value !== null && typeof value === "object") {
    // Preserve Firestore FieldValue/Timestamp and other class instances
    if (Object.getPrototypeOf(value) !== Object.prototype) {
      return value;
    }
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as object)) {
      if (val !== undefined) {
        result[key] = removeUndefined(val);
      }
    }
    return result as T;
  }
  return value;
}

export function sanitizeSettings(raw: unknown): CenterSettings {
  const data = (raw || {}) as Partial<CenterSettings>;

  const subjects = Array.isArray(data.subjects)
    ? data.subjects
        .filter(
          (s: unknown) =>
            s && typeof (s as { name?: string }).name === "string"
        )
        .map(sanitizeSubject)
    : [];

  const bundlePriceRaw =
    typeof data.bundlePrice === "number"
      ? data.bundlePrice
      : Number(data.bundlePrice);
  const bundlePrice =
    data.bundlePrice === undefined
      ? undefined
      : Number.isFinite(bundlePriceRaw) && bundlePriceRaw >= 0
      ? bundlePriceRaw
      : undefined;

  const maxStudentsPerClass =
    typeof data.maxStudentsPerClass === "number"
      ? data.maxStudentsPerClass
      : Number(data.maxStudentsPerClass);

  const groupsPerYear = Array.isArray(data.groupsPerYear)
    ? data.groupsPerYear
        .filter(
          (g: unknown) =>
            g &&
            ALLOWED_LEVELS.includes(
              (g as { level?: string }).level as EducationLevel
            ) &&
            typeof (g as { grade?: unknown }).grade === "number"
        )
        .map(sanitizeGradeGroup)
    : [];

  const years = Array.isArray(data.years)
    ? data.years.map(sanitizeYearPackage)
    : buildYearsFromDraft({
        subjects,
        bundlePrice,
        maxStudentsPerClass,
        groupsPerYear,
      });

  return removeUndefined({
    subjects,
    bundlePrice,
    maxStudentsPerClass: Number.isFinite(maxStudentsPerClass)
      ? Math.max(0, maxStudentsPerClass)
      : 0,
    groupsPerYear,
    years,
  }) as CenterSettings;
}

export function buildYearsFromDraft(draft: {
  subjects: CenterSubject[];
  bundlePrice?: number;
  maxStudentsPerClass: number;
  groupsPerYear: CenterGradeGroup[];
}): CenterYearPackage[] {
  const years = new Map<string, CenterYearPackage>();
  for (const subject of draft.subjects) {
    const key = `${subject.level}:${subject.grade}:${subject.track ?? ""}`;
    if (!years.has(key)) {
      const group = draft.groupsPerYear.find(
        (g) => g.level === subject.level && g.grade === subject.grade
      );
      years.set(key, {
        id: randomUUID(),
        level: subject.level,
        grade: subject.grade,
        track: subject.track,
        teacher: undefined,
        subjects: [],
        bundlePrice: draft.bundlePrice,
        maxStudentsPerClass: draft.maxStudentsPerClass,
        groupsPerYear: group ? [group] : [],
      });
    }
    years.get(key)!.subjects.push({ ...subject });
  }
  return Array.from(years.values());
}
