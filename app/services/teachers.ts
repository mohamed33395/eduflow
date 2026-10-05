import {
  collection,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/app/lib/firebase";
import type { Teacher, SubjectAssignment } from "@/app/types";

const COL = "teachers";

function toTeacher(id: string, data: Record<string, unknown>): Teacher {
  return {
    id,
    name: (data.name as string) ?? "",
    email: (data.email as string) ?? "",
    assignedCourses: (data.assignedCourses as string[]) ?? [],
    assignedClassIds: (data.assignedClassIds as string[]) ?? [],
    assignedSubjectIds: (data.assignedSubjectIds as string[]) ?? [],
    subjectAssignments: (data.subjectAssignments as SubjectAssignment[]) ?? [],
    centerId: data.centerId as string | undefined,
    avatarUrl: data.avatarUrl as string | undefined,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : (data.createdAt as string) ?? "",
  };
}

export async function getTeachers(_centerId?: string): Promise<Teacher[]> {
  try {
    const res = await fetch("/api/center/teachers", { credentials: "include" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "Unknown error" }));
      throw new Error(data.error || "Failed to load teachers");
    }
    return (await res.json()) as Teacher[];
  } catch (err) {
    console.error("[services/teachers] getTeachers failed:", err);
    return [];
  }
}

export async function getTeacherById(id: string): Promise<Teacher | null> {
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  return toTeacher(snap.id, snap.data() as Record<string, unknown>);
}

export async function createTeacher(
  data: Omit<Teacher, "id" | "createdAt">
): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateTeacher(
  id: string,
  data: Partial<Omit<Teacher, "id" | "createdAt">>
): Promise<void> {
  await updateDoc(doc(db, COL, id), data as Record<string, unknown>);
}

export async function deleteTeacher(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}
