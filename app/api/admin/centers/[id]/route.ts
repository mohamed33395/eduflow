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
    const centerSnap = await adminDb
      .collection("centers")
      .where("slug", "==", id)
      .limit(1)
      .get();

    if (centerSnap.empty) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const centerDoc = centerSnap.docs[0];
    const centerData = centerDoc.data();
    const centerId = centerDoc.id;

    const center = {
      ...centerData,
      id: centerId,
      createdAt: toDate(centerData.createdAt),
    };

    const [studentsSnap, teachersSnap, paymentsSnap] = await Promise.all([
      adminDb.collection("students").where("centerId", "==", centerId).get(),
      adminDb.collection("teachers").where("centerId", "==", centerId).get(),
      adminDb.collection("payments").get(),
    ]);

    const students = studentsSnap.docs.map((d) => ({
      ...d.data(),
      id: d.id,
      createdAt: toDate(d.data().createdAt),
    }));
    const teachers = teachersSnap.docs.map((d) => ({
      ...d.data(),
      id: d.id,
      createdAt: toDate(d.data().createdAt),
    }));
    const payments = paymentsSnap.docs.map((d) => ({
      ...d.data(),
      id: d.id,
      createdAt: toDate(d.data().createdAt),
    }));

    const paid = payments
      .filter((p: Record<string, unknown>) =>
        students.some((s) => s.id === p.studentId)
      )
      .reduce((sum, p: Record<string, unknown>) => sum + (p.paid as number ?? 0), 0);

    return NextResponse.json({ center, students, teachers, payments, paid });
  } catch (err) {
    console.error("[api/admin/centers/[slug]] load failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Load failed" },
      { status: 500 }
    );
  }
}
