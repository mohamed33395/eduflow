import "server-only";
import { getAdminDb } from "./firebase-admin";
import type {
  Assignment,
  Course,
  Lesson,
  Student,
  Teacher,
  SubjectAssignment,
} from "@/app/types";
import type { Timestamp } from "firebase-admin/firestore";

function toDate(value: unknown): string {
  if (!value) return "";
  if ((value as Timestamp).toDate) {
    return (value as Timestamp).toDate().toISOString();
  }
  if (typeof value === "string") return value;
  return "";
}

function toCourse(id: string, data: Record<string, unknown>): Course {
  return {
    id,
    name: (data.name as string) ?? "",
    slug: (data.slug as string) ?? "",
    type: (data.type as string) ?? "",
    level: (data.level as Course["level"]) ?? "primary",
    gradeFrom: (data.gradeFrom as number) ?? 1,
    gradeTo: (data.gradeTo as number) ?? 12,
    description: (data.description as string) ?? "",
    content: data.content as string | undefined,
    coverImage: data.coverImage as string | undefined,
    ownerId: (data.ownerId as string) ?? "",
    centerId: data.centerId as string | undefined,
    status: (data.status as Course["status"]) ?? "active",
    createdAt: toDate(data.createdAt),
  };
}

function toStudent(id: string, data: Record<string, unknown>): Student {
  return {
    id,
    name: (data.name as string) ?? "",
    username: (data.username as string) ?? "",
    email: data.email as string | undefined,
    centerId: data.centerId as string | undefined,
    classId: data.classId as string | undefined,
    subjectIds: (data.subjectIds as string[]) ?? [],
    subjectAssignments:
      (data.subjectAssignments as unknown as SubjectAssignment[]) ?? [],
    courses: (data.courses as string[]) ?? [],
    avatarUrl: data.avatarUrl as string | undefined,
    createdAt: toDate(data.createdAt),
  };
}

function toTeacher(id: string, data: Record<string, unknown>): Teacher {
  return {
    id,
    name: (data.name as string) ?? "",
    email: (data.email as string) ?? "",
    assignedCourses: (data.assignedCourses as string[]) ?? [],
    assignedClassIds: (data.assignedClassIds as string[]) ?? [],
    assignedSubjectIds: (data.assignedSubjectIds as string[]) ?? [],
    subjectAssignments:
      (data.subjectAssignments as unknown as SubjectAssignment[]) ?? [],
    centerId: data.centerId as string | undefined,
    avatarUrl: data.avatarUrl as string | undefined,
    createdAt: toDate(data.createdAt),
  };
}

function toLesson(id: string, data: Record<string, unknown>): Lesson {
  return {
    id,
    courseId: (data.courseId as string) ?? "",
    title: (data.title as string) ?? "",
    description: data.description as string | undefined,
    videoUrl: data.videoUrl as string | undefined,
    files: (data.files as Lesson["files"]) ?? [],
    order: (data.order as number) ?? 0,
    createdAt: toDate(data.createdAt),
  };
}

function toAssignment(id: string, data: Record<string, unknown>): Assignment {
  return {
    id,
    courseId: (data.courseId as string) ?? "",
    teacherId: (data.teacherId as string) ?? "",
    title: (data.title as string) ?? "",
    description: (data.description as string) ?? "",
    deadline: (data.deadline as string) ?? "",
    maxGrade: data.maxGrade as number | undefined,
    createdAt: toDate(data.createdAt),
  };
}

export async function getStudentDashboard(studentId: string): Promise<{
  student: Student | null;
  courses: Course[];
  totalAssignments: number;
  totalLessons: number;
}> {
  if (!studentId) {
    return { student: null, courses: [], totalAssignments: 0, totalLessons: 0 };
  }

  const adminDb = getAdminDb();
  if (!adminDb) throw new Error("Firebase Admin not configured");

  const studentSnap = await adminDb.collection("students").doc(studentId).get();
  const student = studentSnap.exists
    ? toStudent(studentSnap.id, studentSnap.data() as Record<string, unknown>)
    : null;

  const coursesSnap = await adminDb.collection("courses").get();
  const allCourses = coursesSnap.docs.map((d) =>
    toCourse(d.id, d.data() as Record<string, unknown>)
  );

  const myCourses = allCourses.filter((c) => student?.courses.includes(c.id));

  let totalAssignments = 0;
  let totalLessons = 0;

  if (myCourses.length > 0) {
    const [assignmentSnaps, lessonSnaps] = await Promise.all([
      Promise.all(
        myCourses.map((c) =>
          adminDb
            .collection("assignments")
            .where("courseId", "==", c.id)
            .get()
        )
      ),
      Promise.all(
        myCourses.map((c) =>
          adminDb
            .collection("lessons")
            .where("courseId", "==", c.id)
            .orderBy("order", "asc")
            .get()
        )
      ),
    ]);

    totalAssignments = assignmentSnaps.reduce((sum, s) => sum + s.size, 0);
    totalLessons = lessonSnaps.reduce((sum, s) => sum + s.size, 0);
  }

  return {
    student,
    courses: myCourses,
    totalAssignments,
    totalLessons,
  };
}

export async function getTeacherDashboard(teacherId: string): Promise<{
  teacher: Teacher | null;
  myCourses: Course[];
}> {
  if (!teacherId) {
    return { teacher: null, myCourses: [] };
  }

  const adminDb = getAdminDb();
  if (!adminDb) throw new Error("Firebase Admin not configured");

  const [teacherSnap, coursesSnap] = await Promise.all([
    adminDb.collection("teachers").doc(teacherId).get(),
    adminDb.collection("courses").get(),
  ]);

  const teacher = teacherSnap.exists
    ? toTeacher(teacherSnap.id, teacherSnap.data() as Record<string, unknown>)
    : null;

  const allCourses = coursesSnap.docs.map((d) =>
    toCourse(d.id, d.data() as Record<string, unknown>)
  );

  const myCourses = allCourses.filter((c) =>
    teacher?.assignedCourses.includes(c.id)
  );

  return { teacher, myCourses };
}

export async function getAllCourses(): Promise<Course[]> {
  const adminDb = getAdminDb();
  if (!adminDb) throw new Error("Firebase Admin not configured");
  const snap = await adminDb.collection("courses").get();
  return snap.docs.map((d) => toCourse(d.id, d.data() as Record<string, unknown>));
}

export async function getCourseWithContent(courseId: string): Promise<{
  course: Course | null;
  lessons: Lesson[];
  assignments: Assignment[];
}> {
  const adminDb = getAdminDb();
  if (!adminDb || !courseId) return { course: null, lessons: [], assignments: [] };

  const [courseSnap, lessonsSnap, assignmentsSnap] = await Promise.all([
    adminDb.collection("courses").doc(courseId).get(),
    adminDb
      .collection("lessons")
      .where("courseId", "==", courseId)
      .orderBy("order", "asc")
      .get(),
    adminDb
      .collection("assignments")
      .where("courseId", "==", courseId)
      .get(),
  ]);

  const course = courseSnap.exists
    ? toCourse(courseSnap.id, courseSnap.data() as Record<string, unknown>)
    : null;

  const lessons = lessonsSnap.docs.map((d) =>
    toLesson(d.id, d.data() as Record<string, unknown>)
  );

  const assignments = assignmentsSnap.docs.map((d) =>
    toAssignment(d.id, d.data() as Record<string, unknown>)
  );

  return { course, lessons, assignments };
}
