import "server-only";
import { getAdminDb } from "@/app/lib/firebase-admin";
import type { Course } from "@/app/types";
import type { Timestamp } from "firebase-admin/firestore";

const COL = "courses";

function toCourse(id: string, data: Record<string, unknown>): Course {
  const createdAt =
    data.createdAt && (data.createdAt as Timestamp).toDate
      ? (data.createdAt as Timestamp).toDate().toISOString()
      : (data.createdAt as string) ?? "";
  return {
    id,
    name: (data.name as string) ?? "",
    slug: (data.slug as string) ?? "",
    type: (data.type as string) ?? "",
    level: (data.level as Course["level"]) ?? "primary",
    gradeFrom: (data.gradeFrom as number) ?? 1,
    gradeTo: (data.gradeTo as number) ?? 12,
    description: (data.description as string) ?? "",
    content: data.content as string | undefined,
    coverImage: data.coverImage as string | undefined,
    ownerId: (data.ownerId as string) ?? "",
    centerId: data.centerId as string | undefined,
    status: (data.status as Course["status"]) ?? "active",
    createdAt,
  };
}

export async function getCourseBySlugPublic(slug: string): Promise<Course | null> {
  const adminDb = getAdminDb();
  if (!adminDb) throw new Error("Firebase Admin not configured");

  const snap = await adminDb
    .collection(COL)
    .where("slug", "==", slug)
    .limit(1)
    .get();

  if (snap.empty) return null;
  const doc = snap.docs[0];
  return toCourse(doc.id, doc.data() as Record<string, unknown>);
}
