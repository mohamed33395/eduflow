import "server-only";
import { apiFetchServer } from "./api-server";
import { ApiError } from "./api";
import {
  toAssignment,
  toCourse,
  toLesson,
  toStudent,
  toTeacher,
  unwrapList,
} from "./mappers";
import type {
  Assignment,
  Course,
  Lesson,
  Student,
  Teacher,
} from "@/app/types";

type Row = Record<string, unknown>;

const notFoundOr = async <T>(
  promise: Promise<T>,
  fallback: T
): Promise<T> => {
  try {
    return await promise;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return fallback;
    throw err;
  }
};

export async function getStudentDashboard(studentId: string): Promise<{
  student: Student | null;
  courses: Course[];
  totalAssignments: number;
  totalLessons: number;
}> {
  if (!studentId) {
    return { student: null, courses: [], totalAssignments: 0, totalLessons: 0 };
  }

  const studentRow = await notFoundOr(
    apiFetchServer<Row>(`/students/${studentId}`),
    null
  );
  const student = studentRow ? toStudent(studentRow) : null;

  const allCourses = unwrapList<Row>(
    await apiFetchServer<unknown>("/courses?limit=100")
  ).map(toCourse);

  const myCourses = allCourses.filter((c) =>
    (student?.courses ?? []).includes(c.id)
  );

  let totalAssignments = 0;
  let totalLessons = 0;

  if (myCourses.length > 0) {
    const [assignmentLists, lessonLists] = await Promise.all([
      Promise.all(
        myCourses.map((c) =>
          apiFetchServer<unknown>(`/courses/${c.id}/assignments`)
        )
      ),
      Promise.all(
        myCourses.map((c) =>
          apiFetchServer<unknown>(`/courses/${c.id}/lessons`)
        )
      ),
    ]);
    totalAssignments = assignmentLists.reduce<number>(
      (sum, l) => sum + unwrapList(l).length,
      0
    );
    totalLessons = lessonLists.reduce<number>(
      (sum, l) => sum + unwrapList(l).length,
      0
    );
  }

  return { student, courses: myCourses, totalAssignments, totalLessons };
}

export async function getTeacherDashboard(teacherId: string): Promise<{
  teacher: Teacher | null;
  myCourses: Course[];
}> {
  if (!teacherId) {
    return { teacher: null, myCourses: [] };
  }

  const [teacherRow, coursesData] = await Promise.all([
    notFoundOr(apiFetchServer<Row>(`/teachers/${teacherId}`), null),
    apiFetchServer<unknown>("/courses?limit=100"),
  ]);

  const teacher = teacherRow ? toTeacher(teacherRow) : null;
  const allCourses = unwrapList<Row>(coursesData).map(toCourse);
  const myCourses = allCourses.filter((c) =>
    (teacher?.assignedCourses ?? []).includes(c.id)
  );

  return { teacher, myCourses };
}

export async function getAllCourses(): Promise<Course[]> {
  const data = await apiFetchServer<unknown>("/courses?limit=100");
  return unwrapList<Row>(data).map(toCourse);
}

export async function getCourseWithContent(courseId: string): Promise<{
  course: Course | null;
  lessons: Lesson[];
  assignments: Assignment[];
}> {
  if (!courseId) return { course: null, lessons: [], assignments: [] };

  const [courseRow, lessonsData, assignmentsData] = await Promise.all([
    notFoundOr(apiFetchServer<Row>(`/courses/${courseId}`), null),
    apiFetchServer<unknown>(`/courses/${courseId}/lessons`),
    apiFetchServer<unknown>(`/courses/${courseId}/assignments`),
  ]);

  return {
    course: courseRow ? toCourse(courseRow) : null,
    lessons: unwrapList<Row>(lessonsData).map(toLesson),
    assignments: unwrapList<Row>(assignmentsData).map(toAssignment),
  };
}