import { NextResponse, type NextRequest } from "next/server";
import { getAdminDb } from "@/app/lib/firebase-admin";
import { getSessionUser } from "@/app/lib/auth-cookies";
import { type Timestamp } from "firebase-admin/firestore";
import type { AppUser } from "@/app/types";

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
    const snap = await adminDb.collection("users").get();
    const users: AppUser[] = snap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        uid: d.id,
        name: (data.name as string) ?? "",
        email: (data.email as string) ?? "",
        phone: (data.phone as string) ?? undefined,
        role: (data.role as AppUser["role"]) ?? "student",
        centerId: (data.centerId as string) ?? undefined,
        courseId: (data.courseId as string) ?? undefined,
        avatarUrl: (data.avatarUrl as string) ?? undefined,
        createdAt: toClientDate(data.createdAt),
      };
    });
    return NextResponse.json(users);
  } catch (err) {
    console.error("[api/admin/users] list failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "List failed" },
      { status: 500 }
    );
  }
}
