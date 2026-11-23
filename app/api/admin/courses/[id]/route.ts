import { NextResponse, type NextRequest } from "next/server";
import {
  apiErrorResponse,
  apiFetchServer,
  getSessionUser,
} from "@/app/lib/api-server";
import { toStudent, toTeacher, unwrapList } from "@/app/lib/mappers";

type Row = Record<string, unknown>;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getSessionUser();
  if (!currentUser || currentUser.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const courses = unwrapList<Row>(await apiFetchServer<unknown>("/courses"));
    const course = courses.find((c) => c.slug === id || c.id === id);
    if (!course) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const courseId = course.id as string;

    const [lessonsData, assignmentsData, studentsData, courseFull] =
      await Promise.all([
        apiFetchServer<unknown>(`/courses/${courseId}/lessons`),
        apiFetchServer<unknown>(`/courses/${courseId}/assignments`),
        apiFetchServer<unknown>(`/students?courseId=${courseId}`),
        // full course carries the teachers relation (this course only)
        apiFetchServer<Row>(`/courses/${courseId}`).catch(() => null),
      ]);

    const lessons = unwrapList<Row>(lessonsData);
    const assignments = unwrapList<Row>(assignmentsData);
    const enrolled = unwrapList<Row>(studentsData).map(toStudent);
    const teachers = Array.isArray(courseFull?.teachers)
      ? (courseFull.teachers as Row[]).map(toTeacher)
      : [];

    return NextResponse.json({
      course,
      lessons,
      assignments,
      students: enrolled,
      enrolled,
      teachers,
    });
  } catch (err) {
    console.error("[api/admin/courses/[slug]] load failed:", err);
    return apiErrorResponse(err, "Load failed");
  }
}

/** Deletes a course via the backend. */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getSessionUser();
  if (!currentUser || currentUser.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const courses = unwrapList<Row>(await apiFetchServer<unknown>("/courses"));
    const course = courses.find((c) => c.slug === id || c.id === id);
    if (!course) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await apiFetchServer(`/courses/${course.id}`, { method: "DELETE" });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/courses/[id]] delete failed:", err);
    return apiErrorResponse(err, "Delete failed");
  }
}
