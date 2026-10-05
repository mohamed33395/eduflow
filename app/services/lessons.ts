import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/app/lib/firebase";
import type { Lesson } from "@/app/types";

const COL = "lessons";

function toLesson(id: string, data: Record<string, unknown>): Lesson {
  return {
    id,
    courseId: (data.courseId as string) ?? "",
    title: (data.title as string) ?? "",
    description: data.description as string | undefined,
    videoUrl: data.videoUrl as string | undefined,
    files: (data.files as Lesson["files"]) ?? [],
    order: (data.order as number) ?? 0,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : (data.createdAt as string) ?? "",
  };
}

export async function getLessons(courseId: string): Promise<Lesson[]> {
  const q = query(
    collection(db, COL),
    where("courseId", "==", courseId),
    orderBy("order", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toLesson(d.id, d.data() as Record<string, unknown>));
}

export async function createLesson(
  data: Omit<Lesson, "id" | "createdAt">
): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateLesson(
  id: string,
  data: Partial<Omit<Lesson, "id" | "createdAt">>
): Promise<void> {
  await updateDoc(doc(db, COL, id), data as Record<string, unknown>);
}

export async function deleteLesson(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}
