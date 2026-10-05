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
import type { Course } from "@/app/types";
import { slugify } from "@/app/lib/utils";

const COL = "courses";

function toCourse(id: string, data: Record<string, unknown>): Course {
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
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : (data.createdAt as string) ?? "",
  };
}

export async function getCourses(centerId?: string): Promise<Course[]> {
  const q = centerId
    ? query(collection(db, COL), where("centerId", "==", centerId))
    : collection(db, COL);
  const snap = await getDocs(q);
  return snap.docs.map((d) => toCourse(d.id, d.data() as Record<string, unknown>));
}

export async function getCourseBySlug(slug: string): Promise<Course | null> {
  const q = query(collection(db, COL), where("slug", "==", slug));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return toCourse(d.id, d.data() as Record<string, unknown>);
}

export async function getCourseById(id: string): Promise<Course | null> {
  if (!id || id === "???") return null;
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  return toCourse(snap.id, snap.data() as Record<string, unknown>);
}

export async function createCourse(
  data: Omit<Course, "id" | "slug" | "createdAt">
): Promise<string> {
  const slug = slugify(data.name);
  const ref = await addDoc(collection(db, COL), {
    ...data,
    slug,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateCourse(
  id: string,
  data: Partial<Omit<Course, "id" | "createdAt">>
): Promise<void> {
  if (data.name) data.slug = slugify(data.name);
  await updateDoc(doc(db, COL, id), data as Record<string, unknown>);
}

export async function deleteCourse(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}
