import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/app/lib/auth-cookies";
import { getAdminAuth, getAdminDb } from "@/app/lib/firebase-admin";
import { removeUndefined } from "@/app/lib/center-settings";
import type { EducationLevel, SubjectAssignment, Teacher } from "@/app/types";

const ALLOWED_LEVELS: EducationLevel[] = [
  "kindergarten",
  "primary",
  "middle",
  "high",
];

async function canManageTeacher(
  currentUser: { role?: string; centerId?: string; courseId?: string },
  teacherCenterId: string
) {
  if (currentUser.role === "super_admin") return true;
  if (currentUser.role === "center_owner" && currentUser.centerId === teacherCenterId)
    return true;
  if (currentUser.role === "course_owner" && currentUser.centerId === teacherCenterId)
    return true;
  return false;
}

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

  const adminAuth = getAdminAuth();
  const adminDb = getAdminDb();
  if (!adminAuth || !adminDb) {
    return NextResponse.json(
      { error: "Admin not configured" },
      { status: 500 }
    );
  }

  const teacherDoc = await adminDb.collection("teachers").doc(id).get();
  if (!teacherDoc.exists) {
    return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
  }

  const teacherData = teacherDoc.data() as Record<string, unknown>;
  const teacherCenterId = (teacherData.centerId as string) || "";

  if (!(await canManageTeacher(currentUser, teacherCenterId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as Record<string, unknown>;
  const {
    name,
    email,
    avatarUrl,
    assignedCourses,
    assignedSubjectIds,
    subjectAssignments,
  } = body;

  const cleanName = typeof name === "string" ? name.trim() : (teacherData.name as string) || "";
  const cleanEmail =
    typeof email === "string" ? email.trim().toLowerCase() : (teacherData.email as string) || "";
  const cleanAvatarUrl =
    typeof avatarUrl === "string" ? avatarUrl.trim() || undefined : undefined;

  const cleanAssignedCourses = Array.isArray(assignedCourses)
    ? (assignedCourses as string[])
    : ((teacherData.assignedCourses as string[]) ?? []);
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
    : ((teacherData.subjectAssignments as SubjectAssignment[]) ?? []);

  const existingUser = await adminDb
    .collection("users")
    .where("email", "==", cleanEmail)
    .get();
  if (!existingUser.empty && existingUser.docs[0].id !== id) {
    return NextResponse.json({ error: "Email already in use" }, { status: 400 });
  }

  try {
    await adminAuth.updateUser(id, {
      email: cleanEmail,
      displayName: cleanName,
    });
  } catch (err: unknown) {
    console.error("[api/center/teachers/[id]] update auth failed:", err);
    const code = (err as { code?: string }).code;
    if (
      code === "auth/email-already-exists" ||
      code === "auth/invalid-email"
    ) {
      return NextResponse.json(
        { error: "Email already in use" },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  const userData = removeUndefined({
    name: cleanName,
    email: cleanEmail,
    avatarUrl: cleanAvatarUrl,
  });

  const updatedTeacher: Teacher = {
    id,
    name: cleanName,
    email: cleanEmail,
    assignedCourses: cleanAssignedCourses,
    assignedClassIds:
      (teacherData.assignedClassIds as string[]) ?? [],
    assignedSubjectIds: cleanAssignedSubjectIds,
    subjectAssignments: cleanSubjectAssignments,
    centerId: teacherCenterId,
    avatarUrl: cleanAvatarUrl,
    createdAt:
      teacherData.createdAt instanceof Date
        ? teacherData.createdAt.toISOString()
        : (teacherData.createdAt as string) || new Date().toISOString(),
  };

  await adminDb
    .collection("users")
    .doc(id)
    .set(userData, { merge: true });
  await adminDb
    .collection("teachers")
    .doc(id)
    .set(removeUndefined(updatedTeacher), { merge: true });

  return NextResponse.json({ teacher: updatedTeacher });
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

  const adminAuth = getAdminAuth();
  const adminDb = getAdminDb();
  if (!adminAuth || !adminDb) {
    return NextResponse.json(
      { error: "Admin not configured" },
      { status: 500 }
    );
  }

  const teacherDoc = await adminDb.collection("teachers").doc(id).get();
  if (!teacherDoc.exists) {
    return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
  }

  const teacherData = teacherDoc.data() as Record<string, unknown>;
  const teacherCenterId = (teacherData.centerId as string) || "";

  if (!(await canManageTeacher(currentUser, teacherCenterId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await adminDb.collection("teachers").doc(id).delete();
    await adminDb.collection("users").doc(id).delete();
    try {
      await adminAuth.deleteUser(id);
    } catch (err) {
      console.error("[api/center/teachers/[id]] delete auth user:", err);
    }
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[api/center/teachers/[id]] delete failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Delete failed" },
      { status: 500 }
    );
  }
}
