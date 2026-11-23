import { api } from "@/app/lib/api";
import { toLesson, unwrapList } from "@/app/lib/mappers";
import type { Lesson, LessonFile } from "@/app/types";

type Row = Record<string, unknown>;

const toBackendFiles = (files: LessonFile[] | undefined) =>
  files?.map((f) => ({ ...f, type: f.type.toUpperCase() }));

export async function getLessons(courseId: string): Promise<Lesson[]> {
  const data = await api.get<unknown>(`/courses/${courseId}/lessons`);
  return unwrapList<Row>(data).map(toLesson);
}

export async function createLesson(
  data: Omit<Lesson, "id" | "createdAt">
): Promise<string> {
  const created = await api.post<Row>("/lessons", {
    courseId: data.courseId,
    title: data.title,
    description: data.description,
    videoUrl: data.videoUrl,
    order: data.order,
    files: toBackendFiles(data.files),
  });
  return created.id as string;
}

export async function updateLesson(
  id: string,
  data: Partial<Omit<Lesson, "id" | "createdAt">>
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (data.title !== undefined) payload.title = data.title;
  if (data.description !== undefined) payload.description = data.description;
  if (data.videoUrl !== undefined) payload.videoUrl = data.videoUrl;
  if (data.order !== undefined) payload.order = data.order;
  if (data.files !== undefined) payload.files = toBackendFiles(data.files);
  await api.patch(`/lessons/${id}`, payload);
}

export async function deleteLesson(id: string): Promise<void> {
  await api.delete(`/lessons/${id}`);
}
