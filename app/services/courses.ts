import { api, ApiError, qs } from "@/app/lib/api";
import { toCourse, unwrapList } from "@/app/lib/mappers";
import { slugify } from "@/app/lib/utils";
import type { Course } from "@/app/types";

type Row = Record<string, unknown>;

export async function getCourses(centerId?: string): Promise<Course[]> {
  const data = await api.get<unknown>(`/courses${qs({ centerId })}`);
  return unwrapList<Row>(data).map(toCourse);
}

export async function getCourseBySlug(slug: string): Promise<Course | null> {
  // authenticated users get the full row via the scoped list
  try {
    const data = await api.get<unknown>("/courses");
    const found = unwrapList<Row>(data).find((c) => c.slug === slug);
    if (found) return toCourse(found);
  } catch {
    // fall through to the public endpoint (anonymous visitors)
  }
  try {
    const data = await api.get<Row>(`/courses/slug/${slug}`);
    return toCourse(data);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function getCourseById(id: string): Promise<Course | null> {
  if (!id || id === "???") return null;
  try {
    const data = await api.get<Row>(`/courses/${id}`);
    return toCourse(data);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function createCourse(
  data: Omit<Course, "id" | "slug" | "createdAt">
): Promise<string> {
  const created = await api.post<Row>("/courses", {
    name: data.name,
    slug: slugify(data.name),
    type: data.type,
    level: data.level?.toUpperCase(),
    gradeFrom: data.gradeFrom,
    gradeTo: data.gradeTo,
    description: data.description,
    content: data.content,
    coverImage: data.coverImage,
    centerId: data.centerId,
    ownerId: data.ownerId,
  });
  return created.id as string;
}

export async function updateCourse(
  id: string,
  data: Partial<Omit<Course, "id" | "createdAt">>
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (data.name !== undefined) payload.name = data.name;
  if (data.name !== undefined) payload.slug = slugify(data.name);
  if (data.type !== undefined) payload.type = data.type;
  if (data.level !== undefined) payload.level = data.level?.toUpperCase();
  if (data.gradeFrom !== undefined) payload.gradeFrom = data.gradeFrom;
  if (data.gradeTo !== undefined) payload.gradeTo = data.gradeTo;
  if (data.description !== undefined) payload.description = data.description;
  if (data.content !== undefined) payload.content = data.content;
  if (data.coverImage !== undefined) payload.coverImage = data.coverImage;
  if (data.centerId !== undefined) payload.centerId = data.centerId;
  if (data.status !== undefined) payload.status = data.status.toUpperCase();
  await api.patch(`/courses/${id}`, payload);
}

export async function deleteCourse(id: string): Promise<void> {
  await api.delete(`/courses/${id}`);
}
