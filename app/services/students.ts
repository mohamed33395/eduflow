import { api, ApiError, qs } from "@/app/lib/api";
import {
  toBackendSubjectAssignment,
  toStudent,
  unwrapList,
  usernameFromEmail,
} from "@/app/lib/mappers";
import { generatePassword } from "@/app/lib/auth-helpers";
import type { Student } from "@/app/types";

type Row = Record<string, unknown>;

export async function getStudents(
  centerId?: string,
  courseId?: string
): Promise<Student[]> {
  const data = await api.get<unknown>(
    `/students${qs({ centerId, courseId })}`
  );
  return unwrapList<Row>(data).map(toStudent);
}

export async function getStudentsByClass(classId: string): Promise<Student[]> {
  const data = await api.get<unknown>(`/students${qs({ classId })}`);
  return unwrapList<Row>(data).map(toStudent);
}

export async function getStudentsBySubject(
  subjectId: string
): Promise<Student[]> {
  const data = await api.get<unknown>(`/students${qs({ subjectId })}`);
  return unwrapList<Row>(data).map(toStudent);
}

export async function getStudentById(id: string): Promise<Student | null> {
  try {
    const data = await api.get<Row>(`/students/${id}`);
    return toStudent(data);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

/** `password` may be supplied via the data bag; otherwise a random one is generated. */
export async function createStudent(
  data: Omit<Student, "id" | "createdAt"> & { password?: string }
): Promise<string> {
  const {
    courses,
    subjectAssignments,
    password,
    teacherId,
    subjectIds,
    ...rest
  } = data;
  const created = await api.post<Row>("/students", {
    name: rest.name,
    username:
      rest.username || usernameFromEmail(rest.email ?? rest.name),
    email: rest.email,
    password: password || generatePassword(),
    phone: rest.phone,
    centerId: rest.centerId,
    level: rest.level?.toUpperCase(),
    grade: rest.grade,
    classId: rest.classId,
    parentName: rest.parentName,
    parentPhone: rest.parentPhone,
    gender: rest.gender?.toUpperCase(),
    primaryTeacherId: teacherId,
    courseIds: courses?.length ? courses : undefined,
  });
  const id = created.id as string;

  const assignments =
    subjectAssignments?.length
      ? subjectAssignments
      : (subjectIds ?? []).map((subjectId) => ({
          subjectId,
          level: rest.level ?? "primary",
          gradeFrom: 1,
          gradeTo: 12,
        }));
  if (assignments.length) {
    await api.put(`/students/${id}/subject-assignments`, {
      assignments: assignments.map(toBackendSubjectAssignment),
    });
  }
  return id;
}

export async function updateStudent(
  id: string,
  data: Partial<Omit<Student, "id" | "createdAt">>
): Promise<void> {
  const { courses, subjectAssignments, teacherId, ...rest } = data;

  const profile: Record<string, unknown> = {};
  if (rest.level !== undefined) profile.level = rest.level?.toUpperCase();
  if (rest.grade !== undefined) profile.grade = rest.grade;
  if (rest.classId !== undefined) profile.classId = rest.classId;
  if (rest.parentName !== undefined) profile.parentName = rest.parentName;
  if (rest.parentPhone !== undefined) profile.parentPhone = rest.parentPhone;
  if (rest.gender !== undefined) profile.gender = rest.gender?.toUpperCase();
  if (teacherId !== undefined) profile.primaryTeacherId = teacherId;
  if (Object.keys(profile).length) {
    await api.patch(`/students/${id}`, profile);
  }

  const user: Record<string, unknown> = {};
  if (rest.name !== undefined) user.name = rest.name;
  if (rest.email !== undefined) user.email = rest.email;
  if (rest.avatarUrl !== undefined) user.avatarUrl = rest.avatarUrl;
  if (rest.phone !== undefined) user.phone = rest.phone;
  if (Object.keys(user).length) {
    await api.patch(`/users/${id}`, user);
  }

  if (courses) {
    const current = unwrapList<Row>(
      (await api.get<Row>(`/students/${id}`)).courses ?? []
    ).map((c) => (c.courseId as string) ?? (c.id as string));
    const toAdd = courses.filter((c) => !current.includes(c));
    const toRemove = current.filter((c) => !courses.includes(c));
    await Promise.all([
      ...toAdd.map((courseId) =>
        api.post(`/students/${id}/enrollments`, { courseId })
      ),
      ...toRemove.map((courseId) =>
        api.delete(`/students/${id}/enrollments/${courseId}`)
      ),
    ]);
  }

  if (subjectAssignments) {
    await api.put(`/students/${id}/subject-assignments`, {
      assignments: subjectAssignments.map(toBackendSubjectAssignment),
    });
  }
}

export async function deleteStudent(id: string): Promise<void> {
  await api.delete(`/students/${id}`);
}
