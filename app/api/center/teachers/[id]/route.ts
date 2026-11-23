import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/app/lib/auth-cookies";
import { apiErrorResponse, apiFetchServer } from "@/app/lib/api-server";
import {
  toBackendSubjectAssignment,
  toTeacher,
} from "@/app/lib/mappers";
import type { EducationLevel, SubjectAssignment } from "@/app/types";

const ALLOWED_LEVELS: EducationLevel[] = [
  "kindergarten",
  "primary",
  "middle",
  "high",
];

type Row = Record<string, unknown>;

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getSessionUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const {
      name,
      email,
      avatarUrl,
      password,
      newPassword,
      assignedCourses,
      assignedClassIds,
      subjectAssignments,
    } = body;

    const userUpdate: Record<string, unknown> = {};
    if (typeof name === "string" && name.trim()) userUpdate.name = name.trim();
    if (typeof email === "string" && email.trim()) {
      userUpdate.email = email.trim().toLowerCase();
    }
    if (typeof avatarUrl === "string") userUpdate.avatarUrl = avatarUrl.trim() || null;
    const pw =
      typeof newPassword === "string" && newPassword.trim()
        ? newPassword
        : typeof password === "string" && password.trim()
          ? password
          : undefined;
    if (pw) userUpdate.newPassword = pw;
    if (Object.keys(userUpdate).length > 0) {
      await apiFetchServer(`/users/${id}`, {
        method: "PATCH",
        body: userUpdate,
      });
    }

    const profileUpdate: Record<string, unknown> = {};
    if (Array.isArray(assignedCourses)) profileUpdate.courseIds = assignedCourses;
    if (Array.isArray(assignedClassIds)) profileUpdate.classIds = assignedClassIds;
    if (Object.keys(profileUpdate).length > 0) {
      await apiFetchServer(`/teachers/${id}`, {
        method: "PATCH",
        body: profileUpdate,
      });
    }

    const cleanAssignments: SubjectAssignment[] = Array.isArray(subjectAssignments)
      ? (subjectAssignments as SubjectAssignment[]).filter(
          (a) =>
            typeof a.subjectId === "string" &&
            ALLOWED_LEVELS.includes(a.level as EducationLevel) &&
            typeof a.gradeFrom === "number" &&
            typeof a.gradeTo === "number"
        )
      : [];
    if (Array.isArray(subjectAssignments)) {
      await apiFetchServer(`/teachers/${id}/subject-assignments`, {
        method: "PUT",
        body: {
          assignments: cleanAssignments.map(toBackendSubjectAssignment),
        },
      });
    }

    const row = await apiFetchServer<Row>(`/teachers/${id}`);
    return NextResponse.json({ teacher: toTeacher(row) });
  } catch (err: unknown) {
    console.error("[api/center/teachers/[id]] update failed:", err);
    return apiErrorResponse(err, "Update failed");
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getSessionUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    await apiFetchServer(`/teachers/${id}`, { method: "DELETE" });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[api/center/teachers/[id]] delete failed:", err);
    return apiErrorResponse(err, "Delete failed");
  }
}
