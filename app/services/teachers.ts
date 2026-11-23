import { api, ApiError, qs } from "@/app/lib/api";
import {
  toBackendSubjectAssignment,
  toTeacher,
  unwrapList,
  usernameFromEmail,
} from "@/app/lib/mappers";
import { generatePassword } from "@/app/lib/auth-helpers";
import type { Teacher } from "@/app/types";

type Row = Record<string, unknown>;

export async function getTeachers(_centerId?: string): Promise<Teacher[]> {
  try {
    const data = await api.get<unknown>(
      `/teachers${qs({ centerId: _centerId })}`
    );
    return unwrapList<Row>(data).map(toTeacher);
  } catch (err) {
    console.error("[services/teachers] getTeachers failed:", err);
    return [];
  }
}

export async function getTeacherById(id: string): Promise<Teacher | null> {
  try {
    const data = await api.get<Row>(`/teachers/${id}`);
    return toTeacher(data);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

/** `password` may be supplied via the data bag; otherwise a random one is generated. */
export async function createTeacher(
  data: Omit<Teacher, "id" | "createdAt"> & { password?: string }
): Promise<string> {
  const { password, ...rest } = data;
  const created = await api.post<Row>("/teachers", {
    name: rest.name,
    username: usernameFromEmail(rest.email || rest.name),
    email: rest.email,
    password: password || generatePassword(),
    centerId: rest.centerId,
    compensationType: "FIXED",
    fixedAmount: 0,
    courseIds: rest.assignedCourses?.length ? rest.assignedCourses : undefined,
    classIds: rest.assignedClassIds?.length ? rest.assignedClassIds : undefined,
    subjectAssignments: rest.subjectAssignments?.length
      ? rest.subjectAssignments.map(toBackendSubjectAssignment)
      : undefined,
  });
  const id = created.id as string;
  if (rest.avatarUrl) {
    await api.patch(`/users/${id}`, { avatarUrl: rest.avatarUrl }).catch(() => null);
  }
  return id;
}

export async function updateTeacher(
  id: string,
  data: Partial<Omit<Teacher, "id" | "createdAt">>
): Promise<void> {
  const { subjectAssignments, assignedCourses, assignedClassIds, ...rest } = data;

  const profile: Record<string, unknown> = {};
  if (assignedCourses !== undefined) profile.courseIds = assignedCourses;
  if (assignedClassIds !== undefined) profile.classIds = assignedClassIds;
  if (Object.keys(profile).length) {
    await api.patch(`/teachers/${id}`, profile);
  }

  const user: Record<string, unknown> = {};
  if (rest.name !== undefined) user.name = rest.name;
  if (rest.email !== undefined) user.email = rest.email;
  if (rest.avatarUrl !== undefined) user.avatarUrl = rest.avatarUrl;
  if (Object.keys(user).length) {
    await api.patch(`/users/${id}`, user);
  }

  if (subjectAssignments) {
    await api.put(`/teachers/${id}/subject-assignments`, {
      assignments: subjectAssignments.map(toBackendSubjectAssignment),
    });
  }
}

export async function deleteTeacher(id: string): Promise<void> {
  await api.delete(`/teachers/${id}`);
}
