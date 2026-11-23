/**
 * Maps EduFlow API (NestJS/Prisma) JSON rows to the frontend types in
 * `@/app/types`. Backend uses UPPER_SNAKE enums and relational includes;
 * the frontend keeps its original lowercase shapes.
 */
import type {
  AppUser,
  Assignment,
  AttendanceRecord,
  Center,
  CenterGradeGroup,
  CenterSettings,
  CenterSubject,
  CenterYearPackage,
  Class,
  Course,
  EducationLevel,
  Lesson,
  LessonFile,
  Payment,
  Student,
  Subject,
  SubjectAssignment,
  Submission,
  Teacher,
  TeacherPayout,
  UserRole,
} from "@/app/types";

type Row = Record<string, unknown>;

// ── primitive helpers ──────────────────────────────────────────────

const str = (v: unknown, fallback = ""): string =>
  typeof v === "string" ? v : fallback;

const strOr = (v: unknown): string | undefined =>
  typeof v === "string" && v !== "" ? v : undefined;

const num = (v: unknown, fallback = 0): number =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;

const numOr = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;

const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

const low = (v: unknown, fallback = ""): string =>
  (typeof v === "string" ? v : fallback).toLowerCase();

const iso = (v: unknown): string => str(v, "");

const levelOf = (v: unknown): EducationLevel | undefined => {
  const l = low(v);
  return l === "kindergarten" || l === "primary" || l === "middle" || l === "high"
    ? (l as EducationLevel)
    : undefined;
};

export const unwrapList = <T = Row>(data: unknown): T[] => {
  if (Array.isArray(data)) return data as T[];
  const items = (data as { items?: unknown } | null)?.items;
  return Array.isArray(items) ? (items as T[]) : [];
};

// ── auth / users ───────────────────────────────────────────────────

export const toFrontendRole = (role: unknown): UserRole =>
  low(role, "student") as UserRole;

export const toBackendRole = (role: unknown): string =>
  str(role).toUpperCase();

/** Backend /auth/me or /users row → AppUser */
export function toAppUser(row: Row): AppUser {
  return {
    uid: str(row.id) || str(row.uid),
    name: str(row.name),
    email: str(row.email),
    phone: strOr(row.phone),
    role: toFrontendRole(row.role),
    centerId: strOr(row.centerId),
    courseId: strOr(row.courseId),
    avatarUrl: strOr(row.avatarUrl),
    createdAt: iso(row.createdAt),
  };
}

// ── center settings ────────────────────────────────────────────────

export function toCenterSubject(row: Row): CenterSubject {
  return {
    id: str(row.id),
    level: levelOf(row.level) ?? "primary",
    grade: num(row.grade, 1),
    track: strOr(row.track),
    name: str(row.name),
    price: num(row.price),
  };
}

export function toGradeGroup(row: Row): CenterGradeGroup {
  return {
    level: levelOf(row.level) ?? "primary",
    grade: num(row.grade, 1),
    count: num(row.count),
  };
}

export function toYearPackage(row: Row): CenterYearPackage {
  return {
    id: str(row.id),
    level: levelOf(row.level) ?? "primary",
    grade: num(row.grade, 1),
    track: strOr(row.track),
    teacher: strOr(row.teacherId),
    subjects: arr<Row>(row.subjects).map(toCenterSubject),
    bundlePrice: numOr(row.bundlePrice),
    maxStudentsPerClass: num(row.maxStudentsPerClass),
    groupsPerYear: arr<Row>(row.gradeGroups).map(toGradeGroup),
  };
}

export function toCenterSettings(row: Row): CenterSettings | undefined {
  const has =
    Array.isArray(row.centerSubjects) ||
    Array.isArray(row.yearPackages) ||
    Array.isArray(row.gradeGroups);
  if (!has) return undefined;
  return {
    subjects: arr<Row>(row.centerSubjects).map(toCenterSubject),
    bundlePrice: numOr(row.bundlePrice),
    maxStudentsPerClass: num(row.maxStudentsPerClass),
    groupsPerYear: arr<Row>(row.gradeGroups).map(toGradeGroup),
    years: arr<Row>(row.yearPackages).map(toYearPackage),
  };
}

// ── entities ───────────────────────────────────────────────────────

export function toCenter(row: Row): Center {
  return {
    id: str(row.id),
    name: str(row.name),
    slug: str(row.slug),
    logo: strOr(row.logo),
    email: str(row.email),
    phone: strOr(row.phone),
    address: strOr(row.address),
    status: low(row.status, "active") as Center["status"],
    ownerId: str(row.ownerId),
    settings: toCenterSettings(row),
    createdAt: iso(row.createdAt),
  };
}

export function toCourse(row: Row): Course {
  return {
    id: str(row.id),
    name: str(row.name),
    slug: str(row.slug),
    type: str(row.type),
    level: levelOf(row.level) ?? "primary",
    gradeFrom: num(row.gradeFrom, 1),
    gradeTo: num(row.gradeTo, 12),
    description: str(row.description),
    content: strOr(row.content),
    coverImage: strOr(row.coverImage),
    ownerId: str(row.ownerId),
    centerId: strOr(row.centerId),
    status: low(row.status, "active") as Course["status"],
    createdAt: iso(row.createdAt),
  };
}

export function toClass(row: Row): Class {
  const teachers = arr<Row>(row.teachers);
  const teacherIds =
    teachers.length > 0
      ? teachers.map((t) => str(t.id)).filter(Boolean)
      : arr<string>(row.teacherIds);
  return {
    id: str(row.id),
    name: str(row.name),
    level: levelOf(row.level) ?? "primary",
    gradeFrom: num(row.gradeFrom, 1),
    gradeTo: num(row.gradeTo, 12),
    centerId: strOr(row.centerId),
    teacherIds,
    status: low(row.status, "active") as Class["status"],
    createdAt: iso(row.createdAt),
  };
}

export function toSubject(row: Row): Subject {
  const teacher = row.teacher as Row | undefined;
  return {
    id: str(row.id),
    name: str(row.name),
    classId: strOr(row.classId),
    centerId: strOr(row.centerId),
    teacherId: strOr(row.teacherId) ?? strOr(teacher?.id),
    description: strOr(row.description),
    status: low(row.status, "active") as Subject["status"],
    createdAt: iso(row.createdAt),
  };
}

export function toSubjectAssignment(row: Row): SubjectAssignment {
  return {
    subjectId: str(row.subjectId),
    level: levelOf(row.level) ?? "primary",
    gradeFrom: num(row.gradeFrom, 1),
    gradeTo: num(row.gradeTo, 12),
    track: strOr(row.track),
  };
}

const refIds = (v: unknown): string[] =>
  arr<Row | string>(v)
    .map((x) => (typeof x === "string" ? x : str((x as Row).courseId) || str((x as Row).id)))
    .filter(Boolean);

export function toStudent(row: Row): Student {
  const user = (row.user as Row) ?? {};
  const subjectAssignments = arr<Row>(row.subjectAssignments).map(
    toSubjectAssignment
  );
  return {
    id: str(row.id),
    name: str(user.name) || str(row.name),
    username: str(user.username) || str(row.username) || str(user.name),
    email: strOr(user.email) ?? strOr(row.email),
    phone: strOr(row.phone) ?? strOr(user.phone),
    parentName: strOr(row.parentName),
    parentPhone: strOr(row.parentPhone),
    centerId: strOr(row.centerId),
    level: levelOf(row.level),
    grade: numOr(row.grade),
    classId: strOr(row.classId),
    subjectIds: subjectAssignments.map((a) => a.subjectId),
    subjectAssignments,
    teacherId: strOr(row.primaryTeacherId) ?? strOr(row.teacherId),
    gender:
      low(row.gender) === "male" || low(row.gender) === "female"
        ? (low(row.gender) as Student["gender"])
        : undefined,
    courses: refIds(row.courses),
    avatarUrl: strOr(row.avatarUrl) ?? strOr(user.avatarUrl),
    createdAt: iso(row.createdAt),
  };
}

export function toTeacher(row: Row): Teacher {
  const user = (row.user as Row) ?? {};
  return {
    id: str(row.id),
    name: str(user.name) || str(row.name),
    email: str(user.email) || str(row.email),
    assignedCourses: refIds(row.courses),
    assignedClassIds: refIds(row.classes),
    assignedSubjectIds: arr<Row>(row.subjectAssignments).map((a) =>
      str(a.subjectId)
    ),
    subjectAssignments: arr<Row>(row.subjectAssignments).map(
      toSubjectAssignment
    ),
    centerId: strOr(row.centerId),
    avatarUrl: strOr(row.avatarUrl) ?? strOr(user.avatarUrl),
    compensationType:
      low(row.compensationType) === "percentage"
        ? "percentage"
        : low(row.compensationType) === "fixed"
          ? "fixed"
          : undefined,
    fixedAmount: numOr(row.fixedAmount),
    commissionPercent: numOr(row.commissionPercent),
    createdAt: iso(row.createdAt),
  };
}

const FILE_TYPES: Record<string, LessonFile["type"]> = {
  PDF: "pdf",
  IMAGE: "image",
  VIDEO: "video",
  OTHER: "other",
};

export function toLesson(row: Row): Lesson {
  return {
    id: str(row.id),
    courseId: str(row.courseId),
    title: str(row.title),
    description: strOr(row.description),
    videoUrl: strOr(row.videoUrl),
    files: arr<Row>(row.files).map((f) => ({
      name: str(f.name),
      url: str(f.url),
      type: FILE_TYPES[str(f.type).toUpperCase()] ?? "other",
    })),
    order: num(row.order),
    createdAt: iso(row.createdAt),
  };
}

export function toAssignment(row: Row): Assignment {
  return {
    id: str(row.id),
    courseId: str(row.courseId),
    teacherId: str(row.teacherId),
    title: str(row.title),
    description: str(row.description),
    deadline: iso(row.deadline),
    maxGrade: numOr(row.maxGrade),
    createdAt: iso(row.createdAt),
  };
}

export function toSubmission(row: Row): Submission {
  return {
    id: str(row.id),
    assignmentId: str(row.assignmentId),
    studentId: str(row.studentId),
    fileUrl: strOr(row.fileUrl),
    text: strOr(row.text),
    grade: numOr(row.grade),
    feedback: strOr(row.feedback),
    submittedAt: iso(row.submittedAt),
    status: low(row.status, "pending") as Submission["status"],
  };
}

export function toAttendance(row: Row): AttendanceRecord {
  return {
    id: str(row.id),
    userId: str(row.userId),
    courseId: strOr(row.courseId),
    date: iso(row.date),
    status: low(row.status, "present") as AttendanceRecord["status"],
  };
}

export function toPayment(row: Row): Payment {
  const amount = num(row.amount);
  const paid = num(row.paid);
  const student = (row.student as Row) ?? {};
  const sUser = (student.user as Row) ?? {};
  const course = (row.course as Row) ?? {};
  return {
    id: str(row.id),
    studentId: str(row.studentId),
    courseId: str(row.courseId),
    amount,
    paid,
    remaining: numOr(row.remaining) ?? Math.max(0, amount - paid),
    dueDate: strOr(row.dueDate),
    createdAt: iso(row.createdAt),
    studentName: strOr(sUser.name) ?? strOr(student.name),
    courseName: strOr(course.name),
    studentLevel: levelOf(student.level),
    studentGrade: numOr(student.grade),
  };
}

export function toPayout(row: Row): TeacherPayout {
  const teacher = (row.teacher as Row) ?? {};
  const tUser = (teacher.user as Row) ?? {};
  const status = low(row.status, "pending");
  return {
    id: str(row.id),
    teacherId: str(row.teacherId),
    teacherName: strOr(tUser.name) ?? strOr(teacher.name),
    periodStart: iso(row.periodStart),
    periodEnd: iso(row.periodEnd),
    compensationType:
      low(row.compensationType) === "percentage" ? "percentage" : "fixed",
    fixedAmount: numOr(row.fixedAmount),
    commissionPercent: numOr(row.commissionPercent),
    collectedRevenue: num(row.collectedRevenue),
    dueAmount: num(row.dueAmount),
    status:
      status === "approved" || status === "paid"
        ? status
        : ("pending" as const),
    notes: strOr(row.notes),
    paidAt: strOr(row.paidAt),
    createdAt: iso(row.createdAt),
  };
}

// ── outgoing payload helpers ───────────────────────────────────────

/** Derive a valid backend username from an email or name. */
export function usernameFromEmail(email: string): string {
  const local = email.split("@")[0] || "user";
  const clean = local.replace(/[^a-zA-Z0-9_.-]/g, "_");
  return clean.length >= 3 ? clean : `${clean}usr`.slice(0, 50);
}

/** frontend SubjectAssignment → backend DTO (uppercase level) */
export function toBackendSubjectAssignment(a: SubjectAssignment) {
  return {
    subjectId: a.subjectId,
    level: str(a.level).toUpperCase(),
    gradeFrom: a.gradeFrom,
    gradeTo: a.gradeTo,
    ...(a.track && { track: a.track }),
  };
}
