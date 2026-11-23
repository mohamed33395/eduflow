import { NextRequest, NextResponse } from "next/server";
import {
  apiErrorResponse,
  apiFetchServer,
  getSessionUser,
} from "@/app/lib/api-server";
import { unwrapList } from "@/app/lib/mappers";

type Row = Record<string, unknown>;

/**
 * POST /api/center/attendance/checkin { userId }
 * Staff-only (any role except student). Marks the target user present
 * for today, reusing today's existing record when present.
 */
export async function POST(req: NextRequest) {
  const actor = await getSessionUser();
  if (!actor) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }
  if (actor.role === "student") {
    return NextResponse.json(
      { error: "Only staff can record attendance" },
      { status: 403 }
    );
  }

  try {
    const body = (await req.json()) as { userId?: string };
    const userId = body.userId?.trim();
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }

    const target = await apiFetchServer<Row>(`/users/${userId}`);
    if (
      actor.role !== "super_admin" &&
      actor.centerId &&
      (target.centerId as string | undefined) !== actor.centerId
    ) {
      return NextResponse.json(
        { error: "This user is not in your center" },
        { status: 403 }
      );
    }

    const today = new Date().toISOString().slice(0, 10);

    const list = await apiFetchServer<unknown>(`/attendance?userId=${userId}`);
    const todayRecord = unwrapList<Row>(list).find(
      (r) =>
        typeof r.date === "string" &&
        r.date.slice(0, 10) === today &&
        !r.courseId
    );

    if (todayRecord?.id) {
      await apiFetchServer(`/attendance/${todayRecord.id}`, {
        method: "PATCH",
        body: { status: "PRESENT" },
      });
    } else {
      await apiFetchServer("/attendance", {
        method: "POST",
        body: {
          date: today,
          entries: [{ userId, status: "PRESENT" }],
        },
      });
    }

    return NextResponse.json({
      name: target.name ?? "",
      role: target.role ?? "",
      date: today,
      status: "present",
      alreadyMarked: !!todayRecord,
    });
  } catch (err) {
    return apiErrorResponse(err, "Check-in failed");
  }
}
