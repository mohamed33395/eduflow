import { api, ApiError, qs } from "@/app/lib/api";
import { toSubject, unwrapList } from "@/app/lib/mappers";
import type { Subject } from "@/app/types";

type Row = Record<string, unknown>;

export async function getSubjects(
  filters: { classId?: string; centerId?: string } = {}
): Promise<Subject[]> {
  const data = await api.get<unknown>(
    `/subjects${qs({ classId: filters.classId, centerId: filters.centerId })}`
  );
  return unwrapList<Row>(data).map(toSubject);
}

export async function getSubjectById(id: string): Promise<Subject | null> {
  try {
    const data = await api.get<Row>(`/subjects/${id}`);
    return toSubject(data);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function createSubject(
  data: Omit<Subject, "id" | "createdAt">
): Promise<string> {
  const created = await api.post<Row>("/subjects", {
    name: data.name,
    classId: data.classId,
    centerId: data.centerId,
    teacherId: data.teacherId,
    description: data.description,
  });
  return created.id as string;
}

export async function updateSubject(
  id: string,
  data: Partial<Omit<Subject, "id" | "createdAt">>
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (data.name !== undefined) payload.name = data.name;
  if (data.classId !== undefined) payload.classId = data.classId;
  if (data.centerId !== undefined) payload.centerId = data.centerId;
  if (data.teacherId !== undefined) payload.teacherId = data.teacherId;
  if (data.description !== undefined) payload.description = data.description;
  if (data.status !== undefined) payload.status = data.status.toUpperCase();
  await api.patch(`/subjects/${id}`, payload);
}

export async function deleteSubject(id: string): Promise<void> {
  await api.delete(`/subjects/${id}`);
}
