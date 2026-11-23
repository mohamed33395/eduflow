import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/app/lib/auth-cookies";
import { apiErrorResponse, apiFetchServer } from "@/app/lib/api-server";
import {
  toBackendSubjectAssignment,
  usernameFromEmail,
} from "@/app/lib/mappers";
import type { Student, EducationLevel, SubjectAssignment } from "@/app/types";

const ALLOWED_LEVELS: EducationLevel[] = [
  "kindergarten",
  "primary",
  "middle",
  "high",
];

export async function POST(req: NextRequest) {
  const currentUser = await getSessionUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (currentUser.role !== "super_admin" && currentUser.role !== "center_owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!currentUser.centerId) {
    return NextResponse.json({ error: "No center assigned" }, { status: 400 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const {
    name,
    phone,
    email,
    password,
    parentName,
    parentPhone,
    level,
    grade,
    classId,
    teacherId,
    gender,
    courses,
    subjectIds,
    subjectAssignments,
    avatarUrl,
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
  const cleanPhone = typeof phone === "string" ? phone.trim() : "";
  const cleanParentName =
    typeof parentName === "string" ? parentName.trim() : "";
  const cleanParentPhone =
    typeof parentPhone === "string" ? parentPhone.trim() : "";
  const cleanLevel = ALLOWED_LEVELS.includes(level as EducationLevel)
    ? (level as EducationLevel)
    : undefined;
  const cleanGrade = typeof grade === "number" ? grade : undefined;
  const cleanClassId =
    typeof classId === "string" ? classId || undefined : undefined;
  const cleanTeacherId =
    typeof teacherId === "string" ? teacherId || undefined : undefined;
  const cleanGender: Student["gender"] | undefined =
    gender === "male" || gender === "female" ? gender : undefined;
  const cleanCourses = Array.isArray(courses) ? (courses as string[]) : [];
  const cleanSubjectIds = Array.isArray(subjectIds)
    ? (subjectIds as string[])
    : cleanCourses;
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
  const cleanAvatarUrl =
    typeof avatarUrl === "string" ? avatarUrl || undefined : undefined;

  try {
    const created = await apiFetchServer<{ id: string }>("/students", {
      method: "POST",
      body: {
        name: cleanName,
        username: usernameFromEmail(cleanEmail),
        email: cleanEmail,
        password,
        phone: cleanPhone || undefined,
        centerId: currentUser.centerId,
        level: cleanLevel?.toUpperCase(),
        grade: cleanGrade,
        classId: cleanClassId,
        parentName: cleanParentName || undefined,
        parentPhone: cleanParentPhone || undefined,
        gender: cleanGender?.toUpperCase(),
        primaryTeacherId: cleanTeacherId,
        courseIds: cleanCourses.length ? cleanCourses : undefined,
      },
    });
    const uid = created.id;

    if (cleanAvatarUrl) {
      await apiFetchServer(`/users/${uid}`, {
        method: "PATCH",
        body: { avatarUrl: cleanAvatarUrl },
      }).catch(() => null);
    }

    if (cleanSubjectAssignments.length) {
      await apiFetchServer(`/students/${uid}/subject-assignments`, {
        method: "PUT",
        body: {
          assignments: cleanSubjectAssignments.map(toBackendSubjectAssignment),
        },
      });
    }

    const student: Student = {
      id: uid,
      name: cleanName,
      username: usernameFromEmail(cleanEmail),
      email: cleanEmail,
      phone: cleanPhone || undefined,
      parentName: cleanParentName || undefined,
      parentPhone: cleanParentPhone || undefined,
      centerId: currentUser.centerId,
      level: cleanLevel,
      grade: cleanGrade,
      classId: cleanClassId,
      teacherId: cleanTeacherId,
      gender: cleanGender,
      courses: cleanCourses,
      subjectIds: cleanSubjectIds,
      subjectAssignments: cleanSubjectAssignments,
      avatarUrl: cleanAvatarUrl,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json({ uid, student });
  } catch (err: unknown) {
    console.error("[api/center/students] create failed:", err);
    return apiErrorResponse(err, "Create failed");
  }
}
