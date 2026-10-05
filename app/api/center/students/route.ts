import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/app/lib/auth-cookies";
import { getAdminAuth, getAdminDb } from "@/app/lib/firebase-admin";
import type { AppUser, Student, EducationLevel, SubjectAssignment } from "@/app/types";

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

  const adminAuth = getAdminAuth();
  const adminDb = getAdminDb();
  if (!adminAuth || !adminDb) {
    return NextResponse.json(
      { error: "Admin not configured" },
      { status: 500 }
    );
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
      if (existing?.role && existing.role !== "student") {
        return NextResponse.json(
          { error: "Email already used by another role" },
          { status: 400 }
        );
      }
      if (existing?.centerId && existing.centerId !== currentUser.centerId) {
        return NextResponse.json(
          { error: "Email belongs to another center" },
          { status: 400 }
        );
      }
    }

    const studentDoc = await adminDb.collection("students").doc(uid).get();
    if (studentDoc.exists) {
      const existingCenter = (studentDoc.data() as { centerId?: string })
        .centerId;
      if (existingCenter === currentUser.centerId) {
        return NextResponse.json(
          { error: "Student already exists in this center" },
          { status: 400 }
        );
      }
      if (existingCenter && existingCenter !== currentUser.centerId) {
        return NextResponse.json(
          { error: "Email belongs to another center" },
          { status: 400 }
        );
      }
    }

    await adminAuth.updateUser(uid, { password, displayName: cleanName });

    const userData: AppUser = {
      uid,
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone || undefined,
      role: "student",
      centerId: currentUser.centerId,
      avatarUrl: cleanAvatarUrl,
      createdAt: new Date().toISOString(),
    };

    await adminDb.collection("users").doc(uid).set(userData, { merge: true });

    const studentData = {
      uid,
      name: cleanName,
      username: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      parentName: cleanParentName,
      parentPhone: cleanParentPhone,
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
    };

    const student: Student = {
      id: uid,
      ...studentData,
      createdAt: new Date().toISOString(),
    };

    await adminDb.collection("students").doc(uid).set({
      ...studentData,
      createdAt: student.createdAt,
    });

    return NextResponse.json({ uid, student });
  } catch (err: unknown) {
    console.error("[api/center/students] create failed:", err);
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
