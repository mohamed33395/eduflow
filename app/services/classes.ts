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
import type { Class } from "@/app/types";

const COL = "classes";

function toClass(id: string, data: Record<string, unknown>): Class {
  return {
    id,
    name: (data.name as string) ?? "",
    level: (data.level as Class["level"]) ?? "primary",
    gradeFrom: (data.gradeFrom as number) ?? 1,
    gradeTo: (data.gradeTo as number) ?? 12,
    centerId: data.centerId as string | undefined,
    teacherIds: (data.teacherIds as string[]) ?? [],
    status: (data.status as Class["status"]) ?? "active",
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : (data.createdAt as string) ?? "",
  };
}

export async function getClasses(centerId?: string): Promise<Class[]> {
  const q = centerId
    ? query(collection(db, COL), where("centerId", "==", centerId))
    : collection(db, COL);
  const snap = await getDocs(q);
  return snap.docs.map((d) => toClass(d.id, d.data() as Record<string, unknown>));
}

export async function getClassById(id: string): Promise<Class | null> {
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  return toClass(snap.id, snap.data() as Record<string, unknown>);
}

export async function createClass(
  data: Omit<Class, "id" | "createdAt">
): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateClass(
  id: string,
  data: Partial<Omit<Class, "id" | "createdAt">>
): Promise<void> {
  await updateDoc(doc(db, COL, id), data as Record<string, unknown>);
}

export async function deleteClass(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}
