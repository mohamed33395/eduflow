import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/app/lib/firebase";
import type { Payment } from "@/app/types";

const COL = "payments";

function toPayment(id: string, data: Record<string, unknown>): Payment {
  return {
    id,
    studentId: (data.studentId as string) ?? "",
    courseId: (data.courseId as string) ?? "",
    amount: (data.amount as number) ?? 0,
    paid: (data.paid as number) ?? 0,
    remaining: (data.remaining as number) ?? 0,
    dueDate: data.dueDate as string | undefined,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : (data.createdAt as string) ?? "",
  };
}

export async function getPayments(studentId?: string): Promise<Payment[]> {
  const q = studentId
    ? query(collection(db, COL), where("studentId", "==", studentId))
    : collection(db, COL);
  const snap = await getDocs(q);
  return snap.docs.map((d) => toPayment(d.id, d.data() as Record<string, unknown>));
}

export async function createPayment(
  data: Omit<Payment, "id" | "createdAt">
): Promise<string> {
  const ref = await addDoc(collection(db, COL), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function recordPayment(
  id: string,
  amount: number
): Promise<void> {
  const snap = await getDocs(
    query(collection(db, COL), where("__name__", "==", id))
  );
  if (snap.empty) return;
  const current = snap.docs[0].data() as { paid: number; remaining: number; amount: number };
  const newPaid = (current.paid ?? 0) + amount;
  const newRemaining = (current.amount ?? 0) - newPaid;
  await updateDoc(doc(db, COL, id), {
    paid: newPaid,
    remaining: Math.max(0, newRemaining),
  });
}

export async function deletePayment(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}

export async function getTotalRevenue(): Promise<number> {
  const snap = await getDocs(collection(db, COL));
  return snap.docs.reduce((sum, d) => {
    const data = d.data() as { paid?: number };
    return sum + (data.paid ?? 0);
  }, 0);
}
