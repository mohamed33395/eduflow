import { NextResponse, type NextRequest } from "next/server";
import {
  apiErrorResponse,
  apiFetchServer,
  fetchAllPages,
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
    const centers = unwrapList<Row>(await apiFetchServer<unknown>("/centers"));
    const center = centers.find((c) => c.slug === id || c.id === id);
    if (!center) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const centerId = center.id as string;

    const [studentsData, teachersData, payments, billings, centerDetail] =
      await Promise.all([
        apiFetchServer<unknown>(`/students?centerId=${centerId}`),
        apiFetchServer<unknown>(`/teachers?centerId=${centerId}`),
        fetchAllPages<Row>("/payments"),
        apiFetchServer<unknown>(`/centers/${centerId}/billings`).catch(() => []),
        // detail carries centerSubjects — the center's own subject catalog
        apiFetchServer<Row>(`/centers/${centerId}`).catch(() => null),
      ]);

    const students = unwrapList<Row>(studentsData).map(toStudent);
    const teachers = unwrapList<Row>(teachersData).map(toTeacher);
    const subjectsCount = Array.isArray(centerDetail?.centerSubjects)
      ? centerDetail.centerSubjects.length
      : 0;

    const paid = payments
      .filter((p) => students.some((s) => s.id === p.studentId))
      .reduce((sum, p) => sum + (typeof p.paid === "number" ? p.paid : 0), 0);

    return NextResponse.json({
      center,
      students,
      teachers,
      payments,
      paid,
      billings: unwrapList<Row>(billings),
      subjectsCount,
    });
  } catch (err) {
    console.error("[api/admin/centers/[slug]] load failed:", err);
    return apiErrorResponse(err, "Load failed");
  }
}

/** Soft-deletes (deactivates) a center via the backend. */
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
    const centers = unwrapList<Row>(await apiFetchServer<unknown>("/centers"));
    const center = centers.find((c) => c.slug === id || c.id === id);
    if (!center) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await apiFetchServer(`/centers/${center.id}`, { method: "DELETE" });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/centers/[id]] delete failed:", err);
    return apiErrorResponse(err, "Delete failed");
  }
}
