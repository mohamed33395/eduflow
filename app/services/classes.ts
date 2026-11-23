import { api, ApiError, qs } from "@/app/lib/api";
import { toClass, unwrapList } from "@/app/lib/mappers";
import type { Class } from "@/app/types";

type Row = Record<string, unknown>;

export async function getClasses(centerId?: string): Promise<Class[]> {
  const data = await api.get<unknown>(`/classes${qs({ centerId })}`);
  return unwrapList<Row>(data).map(toClass);
}

export async function getClassById(id: string): Promise<Class | null> {
  try {
    const data = await api.get<Row>(`/classes/${id}`);
    return toClass(data);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function createClass(
  data: Omit<Class, "id" | "createdAt">
): Promise<string> {
  const created = await api.post<Row>("/classes", {
    name: data.name,
    level: data.level?.toUpperCase(),
    gradeFrom: data.gradeFrom,
    gradeTo: data.gradeTo,
    centerId: data.centerId,
    teacherIds: data.teacherIds?.length ? data.teacherIds : undefined,
  });
  return created.id as string;
}

export async function updateClass(
  id: string,
  data: Partial<Omit<Class, "id" | "createdAt">>
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (data.name !== undefined) payload.name = data.name;
  if (data.level !== undefined) payload.level = data.level?.toUpperCase();
  if (data.gradeFrom !== undefined) payload.gradeFrom = data.gradeFrom;
  if (data.gradeTo !== undefined) payload.gradeTo = data.gradeTo;
  if (data.centerId !== undefined) payload.centerId = data.centerId;
  if (data.teacherIds !== undefined) payload.teacherIds = data.teacherIds;
  if (data.status !== undefined) payload.status = data.status.toUpperCase();
  await api.patch(`/classes/${id}`, payload);
}

export async function deleteClass(id: string): Promise<void> {
  await api.delete(`/classes/${id}`);
}
