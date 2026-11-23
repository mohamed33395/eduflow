import { NextResponse, type NextRequest } from "next/server";
import {
  apiErrorResponse,
  apiFetchServer,
  getSessionUser,
} from "@/app/lib/api-server";
import { toPhoneDigits } from "@/app/lib/phone";

type Row = Record<string, unknown>;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getSessionUser();
  if (!currentUser || currentUser.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const course = await apiFetchServer<Row>(`/courses/${id}`);
    const ownerId = (course.ownerId as string) || "";

    let ownerEmail = "";
    let ownerPhone = "";
    if (ownerId) {
      try {
        const owner = await apiFetchServer<Row>(`/users/${ownerId}`);
        ownerEmail = (owner.email as string) || "";
        ownerPhone = (owner.phone as string) || "";
      } catch {
        // owner lookup failed — return empty fields
      }
    }

    return NextResponse.json({
      id,
      name: course.name,
      type: course.type,
      level:
        typeof course.level === "string" ? course.level.toLowerCase() : course.level,
      gradeFrom: course.gradeFrom,
      gradeTo: course.gradeTo,
      description: course.description,
      content: course.content,
      status:
        typeof course.status === "string" ? course.status.toLowerCase() : course.status,
      ownerId,
      ownerEmail,
      ownerPhone,
    });
  } catch (err) {
    console.error("[api/admin/courses/[id]/update] GET failed:", err);
    return apiErrorResponse(err, "Load failed");
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getSessionUser();
  if (!currentUser || currentUser.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const course = await apiFetchServer<Row>(`/courses/${id}`).catch(() => null);
    if (!course) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const {
      name,
      type,
      level,
      gradeFrom,
      gradeTo,
      description,
      content,
      status,
      ownerEmail,
      ownerPhone,
      ownerPassword,
      changePassword,
    } = body;

    const ownerPhoneDigits =
      typeof ownerPhone === "string" && ownerPhone.trim()
        ? toPhoneDigits(ownerPhone.trim())
        : "";

    const ownerId = (course.ownerId as string) || "";
    if (!ownerId) {
      return NextResponse.json({ error: "Owner not found" }, { status: 400 });
    }

    const owner = await apiFetchServer<Row>(`/users/${ownerId}`).catch(() => null);
    if (!owner) {
      return NextResponse.json({ error: "Owner not found" }, { status: 400 });
    }
    if (owner.role === "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Cannot change super admin credentials here" },
        { status: 400 }
      );
    }

    const ownerUpdate: Record<string, unknown> = {};
    if (typeof ownerEmail === "string" && ownerEmail && ownerEmail !== owner.email) {
      ownerUpdate.email = ownerEmail;
    }
    if (ownerPhoneDigits) ownerUpdate.phone = ownerPhoneDigits;
    if (
      typeof ownerPassword === "string" &&
      ownerPassword.length >= 8 &&
      changePassword !== false
    ) {
      ownerUpdate.newPassword = ownerPassword;
    }
    if (Object.keys(ownerUpdate).length > 0) {
      await apiFetchServer(`/users/${ownerId}`, {
        method: "PATCH",
        body: ownerUpdate,
      });
    }

    const courseUpdate: Record<string, unknown> = {};
    if (name !== undefined) courseUpdate.name = name;
    if (type !== undefined) courseUpdate.type = type;
    if (level !== undefined) {
      courseUpdate.level =
        typeof level === "string" ? level.toUpperCase() : level;
    }
    if (gradeFrom !== undefined) courseUpdate.gradeFrom = gradeFrom;
    if (gradeTo !== undefined) courseUpdate.gradeTo = gradeTo;
    if (description !== undefined) courseUpdate.description = description;
    if (content !== undefined) courseUpdate.content = content;
    if (status !== undefined) {
      courseUpdate.status =
        typeof status === "string" ? status.toUpperCase() : status;
    }
    if (Object.keys(courseUpdate).length > 0) {
      await apiFetchServer(`/courses/${id}`, {
        method: "PATCH",
        body: courseUpdate,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/admin/courses/[id]/update] PATCH failed:", err);
    return apiErrorResponse(err, "Update failed");
  }
}
