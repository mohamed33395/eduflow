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
import type { Subject } from "@/app/types";

const COL = "subjects";

function toSubject(id: string, data: Record<string, unknown>): Subject {
  return {
    id,
    name: (data.name as string) ?? "",
    classId: data.classId as string | undefined,
    centerId: data.centerId as string | undefined,
    teacherId: data.teacherId as string | undefined,
    description: data.description as string | undefined,
    status: (data.status as Subject["status"]) ?? "active",
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : (data.createdAt as string) ?? "",
  };
}

export async function getSubjects(
  filters: { classId?: string; centerId?: string } = {}
): Promise<Subject[]> {
  let q = collection(db, COL) as any;

  if (filters.classId && filters.centerId) {
    q = query(
      collection(db, COL),
      where("classId", "==", filters.classId),
      where("centerId", "==", filters.centerId)
    );
  } else if (filters.classId) {
    q = query(collection(db, COL), where("classId", "==", filters.classId));
  } else if (filters.centerId) {
    q = query(collection(db, COL), where("centerId", "==", filters.centerId));
  }

  const snap = await getDocs(q);
  return snap.docs.map((d: any) =>
    toSubject(d.id, d.data() as Record<string, unknown>)
  );
}

export async function getSubjectById(id: string): Promise<Subject | null> {
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  return toSubject(snap.id, snap.data() as Record<string, unknown>);
}

export async function createSubject(
  data: Omit<Subject, "id" | "createdAt">
): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateSubject(
  id: string,
  data: Partial<Omit<Subject, "id" | "createdAt">>
): Promise<void> {
  await updateDoc(doc(db, COL, id), data as Record<string, unknown>);
}

export async function deleteSubject(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}
