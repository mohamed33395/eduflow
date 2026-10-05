import { NextResponse, type NextRequest } from "next/server";
import { getAdminDb } from "@/app/lib/firebase-admin";
import { getSessionUser } from "@/app/lib/auth-cookies";
import { type Timestamp } from "firebase-admin/firestore";

function toDate(value: unknown): string {
  if (value && (value as Timestamp).toDate) {
    return (value as Timestamp).toDate().toISOString();
  }
  return typeof value === "string" ? value : "";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const currentUser = await getSessionUser();
  if (!currentUser || currentUser.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json(
      { error: "Firebase Admin not configured" },
      { status: 500 }
    );
  }

  try {
    const courseSnap = await adminDb
      .collection("courses")
      .where("slug", "==", id)
      .limit(1)
      .get();

    if (courseSnap.empty) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const courseDoc = courseSnap.docs[0];
    const courseData = courseDoc.data();
    const courseId = courseDoc.id;

    const course = {
      ...courseData,
      id: courseId,
      createdAt: toDate(courseData.createdAt),
    };

    const [lessonsSnap, assignmentsSnap, studentsSnap] = await Promise.all([
      adminDb
        .collection("lessons")
        .where("courseId", "==", courseId)
        .orderBy("order", "asc")
        .get(),
      adminDb
        .collection("assignments")
        .where("courseId", "==", courseId)
        .get(),
      adminDb.collection("students").get(),
    ]);

    const lessons = lessonsSnap.docs.map((d) => ({
      ...d.data(),
      id: d.id,
      createdAt: toDate(d.data().createdAt),
    }));
    const assignments = assignmentsSnap.docs.map((d) => ({
      ...d.data(),
      id: d.id,
      createdAt: toDate(d.data().createdAt),
    }));
    const students = studentsSnap.docs.map((d) => ({
      ...d.data(),
      id: d.id,
      createdAt: toDate(d.data().createdAt),
    }));

    const enrolled = students.filter((s: Record<string, unknown>) =>
      (s.courses as string[] | undefined)?.includes(courseId)
    );

    return NextResponse.json({ course, lessons, assignments, students, enrolled });
  } catch (err) {
    console.error("[api/admin/courses/[slug]] load failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Load failed" },
      { status: 500 }
    );
  }
}
