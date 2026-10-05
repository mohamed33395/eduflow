import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/app/lib/firebase";
import type { AttendanceRecord } from "@/app/types";

const COL = "attendance";

function toRecord(id: string, data: Record<string, unknown>): AttendanceRecord {
  return {
    id,
    userId: (data.userId as string) ?? "",
    courseId: data.courseId as string | undefined,
    date: (data.date as string) ?? "",
    status: (data.status as AttendanceRecord["status"]) ?? "present",
  };
}

export async function getAttendance(
  userId?: string,
  courseId?: string
): Promise<AttendanceRecord[]> {
  let q = collection(db, COL);
  if (userId) {
    const snap = await getDocs(
      query(q, where("userId", "==", userId))
    );
    return snap.docs.map((d) => toRecord(d.id, d.data() as Record<string, unknown>));
  }
  if (courseId) {
    const snap = await getDocs(
      query(q, where("courseId", "==", courseId))
    );
    return snap.docs.map((d) => toRecord(d.id, d.data() as Record<string, unknown>));
  }
  const snap = await getDocs(q);
  return snap.docs.map((d) => toRecord(d.id, d.data() as Record<string, unknown>));
}

export async function markAttendance(
  data: Omit<AttendanceRecord, "id">
): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateAttendance(
  id: string,
  status: AttendanceRecord["status"]
): Promise<void> {
  await updateDoc(doc(db, COL, id), { status });
}
