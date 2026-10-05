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
import type { Student, SubjectAssignment } from "@/app/types";

const COL = "students";

function toStudent(id: string, data: Record<string, unknown>): Student {
  return {
    id,
    name: (data.name as string) ?? "",
    username: (data.username as string) ?? "",
    email: data.email as string | undefined,
    phone: data.phone as string | undefined,
    parentName: data.parentName as string | undefined,
    parentPhone: data.parentPhone as string | undefined,
    centerId: data.centerId as string | undefined,
    level: data.level as Student["level"] | undefined,
    grade: data.grade as number | undefined,
    classId: data.classId as string | undefined,
    subjectIds: (data.subjectIds as string[]) ?? [],
    subjectAssignments: (data.subjectAssignments as SubjectAssignment[]) ?? [],
    teacherId: data.teacherId as string | undefined,
    gender: data.gender as Student["gender"] | undefined,
    courses: (data.courses as string[]) ?? [],
    avatarUrl: data.avatarUrl as string | undefined,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : (data.createdAt as string) ?? "",
  };
}

export async function getStudents(
  centerId?: string,
  courseId?: string
): Promise<Student[]> {
  const constraints: ReturnType<typeof where>[] = [];
  if (centerId) constraints.push(where("centerId", "==", centerId));
  if (courseId) constraints.push(where("courses", "array-contains", courseId));
  const q =
    constraints.length > 0
      ? query(collection(db, COL), ...constraints)
      : collection(db, COL);
  const snap = await getDocs(q);
  return snap.docs.map((d) => toStudent(d.id, d.data() as Record<string, unknown>));
}

export async function getStudentsByClass(classId: string): Promise<Student[]> {
  const q = query(collection(db, COL), where("classId", "==", classId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toStudent(d.id, d.data() as Record<string, unknown>));
}

export async function getStudentsBySubject(subjectId: string): Promise<Student[]> {
  const q = query(collection(db, COL), where("subjectIds", "array-contains", subjectId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toStudent(d.id, d.data() as Record<string, unknown>));
}

export async function getStudentById(id: string): Promise<Student | null> {
  const snap = await getDoc(doc(db, COL, id));
  if (!snap.exists()) return null;
  return toStudent(snap.id, snap.data() as Record<string, unknown>);
}

export async function createStudent(
  data: Omit<Student, "id" | "createdAt">
): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateStudent(
  id: string,
  data: Partial<Omit<Student, "id" | "createdAt">>
): Promise<void> {
  await updateDoc(doc(db, COL, id), data as Record<string, unknown>);
}

export async function deleteStudent(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}
