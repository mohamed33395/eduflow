import "server-only";
import { getAdminDb } from "@/app/lib/firebase-admin";
import type { Center } from "@/app/types";
import type { Timestamp } from "firebase-admin/firestore";

const COL = "centers";

function toCenter(id: string, data: Record<string, unknown>): Center {
  const createdAt =
    data.createdAt && (data.createdAt as Timestamp).toDate
      ? (data.createdAt as Timestamp).toDate().toISOString()
      : (data.createdAt as string) ?? "";
  return {
    id,
    name: (data.name as string) ?? "",
    slug: (data.slug as string) ?? "",
    logo: data.logo as string | undefined,
    email: (data.email as string) ?? "",
    phone: data.phone as string | undefined,
    address: data.address as string | undefined,
    status: (data.status as Center["status"]) ?? "active",
    ownerId: (data.ownerId as string) ?? "",
    createdAt,
  };
}

export async function getCenterBySlugPublic(slug: string): Promise<Center | null> {
  const adminDb = getAdminDb();
  if (!adminDb) throw new Error("Firebase Admin not configured");

  const snap = await adminDb
    .collection(COL)
    .where("slug", "==", slug)
    .limit(1)
    .get();

  if (snap.empty) return null;
  const doc = snap.docs[0];
  return toCenter(doc.id, doc.data() as Record<string, unknown>);
}
