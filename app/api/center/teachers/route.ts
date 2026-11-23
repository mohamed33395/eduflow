import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/app/lib/auth-cookies";
import { apiErrorResponse, apiFetchServer } from "@/app/lib/api-server";
import {
  toBackendSubjectAssignment,
  toTeacher,
  unwrapList,
  usernameFromEmail,
} from "@/app/lib/mappers";
import type { EducationLevel, SubjectAssignment, Teacher } from "@/app/types";

const ALLOWED_LEVELS: EducationLevel[] = [
  "kindergarten",
  "primary",
  "middle",
  "high",
];

type Row = Record<string, unknown>;

export async function GET() {
  const currentUser = await getSessionUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (
    currentUser.role !== "super_admin" &&
    currentUser.role !== "center_owner" &&
    currentUser.role !== "course_owner"
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const centerId = currentUser.centerId;
  if (!centerId) {
    return NextResponse.json({ error: "Missing centerId" }, { status: 400 });
  }

  try {
    const data = await apiFetchServer<unknown>(
      `/teachers?centerId=${centerId}`
    );
    return NextResponse.json(unwrapList<Row>(data).map(toTeacher));
  } catch (err) {
    console.error("[api/center/teachers] list failed:", err);
    return apiErrorResponse(err, "List failed");
  }
}

export async function POST(req: NextRequest) {
  const currentUser = await getSessionUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (
    currentUser.role !== "super_admin" &&
    currentUser.role !== "center_owner" &&
    currentUser.role !== "course_owner"
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  let centerId =
    currentUser.centerId ??
    (typeof body.centerId === "string" ? body.centerId : "");

  if (
    currentUser.role === "course_owner" &&
    !centerId &&
    typeof currentUser.courseId === "string"
  ) {
    // course owners often belong to a center; resolve via their course
    try {
      const course = await apiFetchServer<Row>(
        `/courses/${currentUser.courseId}`
      );
      centerId = (course?.centerId as string) || "";
    } catch {
      // ignore lookup failure
    }
  }

  if (!centerId) {
    return NextResponse.json({ error: "No center assigned" }, { status: 400 });
  }

  const {
    name,
    email,
    password,
    avatarUrl,
    assignedCourses,
    assignedSubjectIds,
    subjectAssignments,
  } = body;

  if (
    !name ||
    typeof name !== "string" ||
    !email ||
    typeof email !== "string" ||
    !password ||
    typeof password !== "string"
  ) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();
  const cleanAvatarUrl =
    typeof avatarUrl === "string" ? avatarUrl.trim() || undefined : undefined;
  const cleanAssignedCourses = Array.isArray(assignedCourses)
    ? (assignedCourses as string[])
    : [];
  const cleanAssignedSubjectIds = Array.isArray(assignedSubjectIds)
    ? (assignedSubjectIds as string[])
    : cleanAssignedCourses;
  const cleanSubjectAssignments: SubjectAssignment[] = Array.isArray(
    subjectAssignments
  )
    ? (subjectAssignments as SubjectAssignment[]).filter(
        (a) =>
          typeof a.subjectId === "string" &&
          ALLOWED_LEVELS.includes(a.level as EducationLevel) &&
          typeof a.gradeFrom === "number" &&
          typeof a.gradeTo === "number"
      )
    : [];

  try {
    const created = await apiFetchServer<Row>("/teachers", {
      method: "POST",
      body: {
        name: cleanName,
        username: usernameFromEmail(cleanEmail),
        email: cleanEmail,
        password,
        centerId,
        compensationType: "FIXED",
        fixedAmount: 0,
        courseIds: cleanAssignedCourses.length ? cleanAssignedCourses : undefined,
        subjectAssignments: cleanSubjectAssignments.length
          ? cleanSubjectAssignments.map(toBackendSubjectAssignment)
          : undefined,
      },
    });
    const uid = created.id as string;

    if (cleanAvatarUrl) {
      await apiFetchServer(`/users/${uid}`, {
        method: "PATCH",
        body: { avatarUrl: cleanAvatarUrl },
      }).catch(() => null);
    }

    const teacher: Teacher = {
      id: uid,
      name: cleanName,
      email: cleanEmail,
      assignedCourses: cleanAssignedCourses,
      assignedClassIds: [],
      assignedSubjectIds: cleanAssignedSubjectIds,
      subjectAssignments: cleanSubjectAssignments,
      centerId,
      avatarUrl: cleanAvatarUrl,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ uid, teacher });
  } catch (err: unknown) {
    console.error("[api/center/teachers] create failed:", err);
    return apiErrorResponse(err, "Create failed");
  }
}
