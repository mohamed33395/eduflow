import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/app/lib/auth-cookies";
import { apiErrorResponse, apiFetchServer } from "@/app/lib/api-server";
import { toBackendSubjectAssignment, toStudent } from "@/app/lib/mappers";
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
      phone,
      password,
      newPassword,
      avatarUrl,
      parentName,
      parentPhone,
      level,
      grade,
      classId,
      teacherId,
      gender,
      subjectAssignments,
    } = body;

    const userUpdate: Record<string, unknown> = {};
    if (typeof name === "string" && name.trim()) userUpdate.name = name.trim();
    if (typeof email === "string" && email.trim()) {
      userUpdate.email = email.trim().toLowerCase();
    }
    if (typeof phone === "string") userUpdate.phone = phone.trim();
    if (typeof avatarUrl === "string") {
      userUpdate.avatarUrl = avatarUrl.trim() || null;
    }
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
    if (
      typeof level === "string" &&
      ALLOWED_LEVELS.includes(level as EducationLevel)
    ) {
      profileUpdate.level = level.toUpperCase();
    }
    if (typeof grade === "number") profileUpdate.grade = grade;
    if (typeof classId === "string") {
      profileUpdate.classId = classId || null;
    }
    if (typeof parentName === "string") {
      profileUpdate.parentName = parentName.trim();
    }
    if (typeof parentPhone === "string") {
      profileUpdate.parentPhone = parentPhone.trim();
    }
    if (gender === "male" || gender === "female") {
      profileUpdate.gender = gender.toUpperCase();
    }
    if (typeof teacherId === "string") {
      profileUpdate.primaryTeacherId = teacherId || null;
    }
    if (Object.keys(profileUpdate).length > 0) {
      await apiFetchServer(`/students/${id}`, {
        method: "PATCH",
        body: profileUpdate,
      });
    }

    if (Array.isArray(subjectAssignments)) {
      const cleanAssignments = (
        subjectAssignments as SubjectAssignment[]
      ).filter(
        (a) =>
          typeof a.subjectId === "string" &&
          ALLOWED_LEVELS.includes(a.level as EducationLevel) &&
          typeof a.gradeFrom === "number" &&
          typeof a.gradeTo === "number"
      );
      await apiFetchServer(`/students/${id}/subject-assignments`, {
        method: "PUT",
        body: {
          assignments: cleanAssignments.map(toBackendSubjectAssignment),
        },
      });
    }

    const row = await apiFetchServer<Row>(`/students/${id}`);
    return NextResponse.json({ student: toStudent(row) });
  } catch (err: unknown) {
    console.error("[api/center/students/[id]] update failed:", err);
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
    await apiFetchServer(`/students/${id}`, { method: "DELETE" });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[api/center/students/[id]] delete failed:", err);
    return apiErrorResponse(err, "Delete failed");
  }
}
