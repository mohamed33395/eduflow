import { NextResponse, type NextRequest } from "next/server";
import { getAdminDb } from "@/app/lib/firebase-admin";
import { getSessionUser } from "@/app/lib/auth-cookies";
import { type Timestamp } from "firebase-admin/firestore";

function toClientDate(value: unknown): string {
  if (value && (value as Timestamp).toDate) {
    return (value as Timestamp).toDate().toISOString();
  }
  return typeof value === "string" ? value : "";
}

export async function GET(req: NextRequest) {
  const currentUser = await getSessionUser();
  if (!currentUser || currentUser.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json(
      { error: "Firebase Admin not configured" },
      { status: 500 }
    );
  }

  try {
    const [centersSnap, coursesSnap, studentsSnap, teachersSnap, paymentsSnap] =
      await Promise.all([
        adminDb.collection("centers").get(),
        adminDb.collection("courses").get(),
        adminDb.collection("students").get(),
        adminDb.collection("teachers").get(),
        adminDb.collection("payments").get(),
      ]);

    const centers = centersSnap.docs.map((d) => ({
      ...(d.data() as Record<string, unknown>),
      id: d.id,
      createdAt: toClientDate((d.data() as Record<string, unknown>).createdAt),
    }));
    const courses = coursesSnap.docs.map((d) => ({
      ...(d.data() as Record<string, unknown>),
      id: d.id,
      createdAt: toClientDate((d.data() as Record<string, unknown>).createdAt),
    }));
    const students = studentsSnap.docs.map((d) => ({
      ...(d.data() as Record<string, unknown>),
      id: d.id,
      createdAt: toClientDate((d.data() as Record<string, unknown>).createdAt),
    }));
    const teachers = teachersSnap.docs.map((d) => ({
      ...(d.data() as Record<string, unknown>),
      id: d.id,
      createdAt: toClientDate((d.data() as Record<string, unknown>).createdAt),
    }));

    const revenue = paymentsSnap.docs.reduce((sum, d) => {
      const data = d.data() as Record<string, unknown>;
      const amount = typeof data.amount === "number" ? data.amount : 0;
      return sum + amount;
    }, 0);

    return NextResponse.json({
      centers,
      courses,
      students,
      teachers,
      revenue,
    });
  } catch (err) {
    console.error("[api/admin/dashboard] load failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Load failed" },
      { status: 500 }
    );
  }
}
