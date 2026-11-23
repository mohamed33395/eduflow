import { api, ApiError, qs } from "@/app/lib/api";
import { toAssignment, toSubmission, unwrapList } from "@/app/lib/mappers";
import type { Assignment, Submission } from "@/app/types";

type Row = Record<string, unknown>;

export async function getAssignments(courseId: string): Promise<Assignment[]> {
  const data = await api.get<unknown>(`/courses/${courseId}/assignments`);
  return unwrapList<Row>(data).map(toAssignment);
}

export async function getAssignmentById(
  id: string
): Promise<Assignment | null> {
  try {
    const data = await api.get<Row>(`/assignments/${id}`);
    return toAssignment(data);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function createAssignment(
  data: Omit<Assignment, "id" | "createdAt">
): Promise<string> {
  const created = await api.post<Row>("/assignments", {
    courseId: data.courseId,
    title: data.title,
    description: data.description,
    deadline: data.deadline,
    maxGrade: data.maxGrade,
  });
  return created.id as string;
}

export async function updateAssignment(
  id: string,
  data: Partial<Omit<Assignment, "id" | "createdAt">>
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (data.title !== undefined) payload.title = data.title;
  if (data.description !== undefined) payload.description = data.description;
  if (data.deadline !== undefined) payload.deadline = data.deadline;
  if (data.maxGrade !== undefined) payload.maxGrade = data.maxGrade;
  await api.patch(`/assignments/${id}`, payload);
}

export async function deleteAssignment(id: string): Promise<void> {
  await api.delete(`/assignments/${id}`);
}

export async function getSubmissions(
  assignmentId: string
): Promise<Submission[]> {
  const data = await api.get<unknown>(
    `/assignments/${assignmentId}/submissions`
  );
  return unwrapList<Row>(data).map(toSubmission);
}

export async function getStudentSubmissions(
  studentId: string
): Promise<Submission[]> {
  const data = await api.get<unknown>(
    `/submissions${qs({ studentId })}`
  );
  return unwrapList<Row>(data).map(toSubmission);
}

export async function createSubmission(
  data: Omit<Submission, "id" | "submittedAt" | "status">
): Promise<string> {
  const created = await api.post<Row>(
    `/assignments/${data.assignmentId}/submissions`,
    { fileUrl: data.fileUrl, text: data.text }
  );
  return created.id as string;
}

export async function gradeSubmission(
  id: string,
  grade: number,
  feedback: string
): Promise<void> {
  await api.patch(`/submissions/${id}/grade`, { grade, feedback });
}
