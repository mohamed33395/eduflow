import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/app/lib/auth-cookies";
import { getAdminAuth, getAdminDb } from "@/app/lib/firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { removeUndefined } from "@/app/lib/center-settings";
import type { AppUser, EducationLevel, SubjectAssignment, Teacher } from "@/app/types";

const ALLOWED_LEVELS: EducationLevel[] = [
  "kindergarten",
  "primary",
  "middle",
  "high",
];

function toTeacher(id: string, data: Record<string, unknown>): Teacher {
  return {
    id,
    name: (data.name as string) ?? "",
    email: (data.email as string) ?? "",
    assignedCourses: (data.assignedCourses as string[]) ?? [],
    assignedClassIds: (data.assignedClassIds as string[]) ?? [],
    assignedSubjectIds: (data.assignedSubjectIds as string[]) ?? [],
    subjectAssignments: (data.subjectAssignments as SubjectAssignment[]) ?? [],
    centerId: data.centerId as string | undefined,
    avatarUrl: data.avatarUrl as string | undefined,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : (data.createdAt as string) ?? "",
  };
}

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

  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json(
      { error: "Admin not configured" },
      { status: 500 }
    );
  }

  const centerId = currentUser.centerId;
  if (!centerId) {
    return NextResponse.json({ error: "Missing centerId" }, { status: 400 });
  }

  const snap = await adminDb
    .collection("teachers")
    .where("centerId", "==", centerId)
    .get();

  const teachers = snap.docs.map((d) =>
    toTeacher(d.id, d.data() as Record<string, unknown>)
  );

  return NextResponse.json(teachers);
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
    // course owners often belong to a center; try to look it up
    try {
      const adminDb = getAdminDb();
      const course = await adminDb
        ?.collection("courses")
        ?.doc(currentUser.courseId)
        ?.get();
      centerId = (course?.data()?.centerId as string) || "";
    } catch {
      // ignore lookup failure
    }
  }

  if (!centerId) {
    return NextResponse.json({ error: "No center assigned" }, { status: 400 });
  }

  const adminAuth = getAdminAuth();
  const adminDb = getAdminDb();
  if (!adminAuth || !adminDb) {
    return NextResponse.json(
      { error: "Admin not configured" },
      { status: 500 }
    );
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
    let uid: string;
    try {
      const userRecord = await adminAuth.getUserByEmail(cleanEmail);
      uid = userRecord.uid;
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === "auth/user-not-found") {
        const newUser = await adminAuth.createUser({
          email: cleanEmail,
          password,
          displayName: cleanName,
        });
        uid = newUser.uid;
      } else {
        throw err;
      }
    }

    const userDoc = await adminDb.collection("users").doc(uid).get();
    if (userDoc.exists) {
      const existing = userDoc.data() as AppUser | undefined;
      if (existing?.role && existing.role !== "teacher") {
        return NextResponse.json(
          { error: "Email already used by another role" },
          { status: 400 }
        );
      }
      if (
        existing?.centerId &&
        existing.centerId !== centerId
      ) {
        return NextResponse.json(
          { error: "Email belongs to another center" },
          { status: 400 }
        );
      }
    }

    await adminAuth.updateUser(uid, { password, displayName: cleanName });

    const userData = removeUndefined({
      uid,
      name: cleanName,
      email: cleanEmail,
      role: "teacher",
      centerId,
      avatarUrl: cleanAvatarUrl,
      createdAt: new Date().toISOString(),
    });

    await adminDb
      .collection("users")
      .doc(uid)
      .set(userData as AppUser, { merge: true });

    const now = new Date().toISOString();
    const teacherData = removeUndefined({
      id: uid,
      name: cleanName,
      email: cleanEmail,
      assignedCourses: cleanAssignedCourses,
      assignedSubjectIds: cleanAssignedSubjectIds,
      subjectAssignments: cleanSubjectAssignments,
      centerId,
      avatarUrl: cleanAvatarUrl,
      createdAt: now,
    });

    await adminDb
      .collection("teachers")
      .doc(uid)
      .set({
        ...teacherData,
        createdAt: FieldValue.serverTimestamp(),
      });

    return NextResponse.json({ uid, teacher: teacherData });
  } catch (err: unknown) {
    console.error("[api/center/teachers] create failed:", err);
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
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Create failed" },
      { status: 500 }
    );
  }
}
