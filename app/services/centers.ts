import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/app/lib/firebase";
import type { Center } from "@/app/types";
import { slugify } from "@/app/lib/utils";

const COL = "centers";

function toCenter(id: string, data: Record<string, unknown>): Center {
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
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : (data.createdAt as string) ?? "",
  };
}

export async function getCenters(): Promise<Center[]> {
  const snap = await getDocs(collection(db, COL));
  return snap.docs.map((d) => toCenter(d.id, d.data() as Record<string, unknown>));
}

export async function getCenterBySlug(slug: string): Promise<Center | null> {
  const q = query(collection(db, COL), where("slug", "==", slug));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return toCenter(d.id, d.data() as Record<string, unknown>);
}

export async function getCenterById(id: string): Promise<Center | null> {
  if (!id || id === "???") return null;
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  return toCenter(snap.id, snap.data() as Record<string, unknown>);
}

export async function createCenter(
  data: Omit<Center, "id" | "slug" | "createdAt">
): Promise<string> {
  const slug = slugify(data.name);
  const ref = await addDoc(collection(db, COL), {
    ...data,
    slug,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCenter(
  id: string,
  data: Partial<Omit<Center, "id" | "createdAt">>
): Promise<void> {
  if (data.name) data.slug = slugify(data.name);
  await updateDoc(doc(db, COL, id), data as Record<string, unknown>);
}

export async function deleteCenter(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}

export async function toggleCenterStatus(
  id: string,
  status: Center["status"]
): Promise<void> {
  await updateDoc(doc(db, COL, id), { status });
}
