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
import type { Assignment, Submission } from "@/app/types";

const ASSIGN_COL = "assignments";
const SUB_COL = "submissions";

function toAssignment(id: string, data: Record<string, unknown>): Assignment {
  return {
    id,
    courseId: (data.courseId as string) ?? "",
    teacherId: (data.teacherId as string) ?? "",
    title: (data.title as string) ?? "",
    description: (data.description as string) ?? "",
    deadline: (data.deadline as string) ?? "",
    maxGrade: data.maxGrade as number | undefined,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : (data.createdAt as string) ?? "",
  };
}

function toSubmission(id: string, data: Record<string, unknown>): Submission {
  return {
    id,
    assignmentId: (data.assignmentId as string) ?? "",
    studentId: (data.studentId as string) ?? "",
    fileUrl: data.fileUrl as string | undefined,
    text: data.text as string | undefined,
    grade: data.grade as number | undefined,
    feedback: data.feedback as string | undefined,
    submittedAt:
      data.submittedAt instanceof Timestamp
        ? data.submittedAt.toDate().toISOString()
        : (data.submittedAt as string) ?? "",
    status: (data.status as Submission["status"]) ?? "pending",
  };
}

export async function getAssignments(courseId: string): Promise<Assignment[]> {
  const q = query(collection(db, ASSIGN_COL), where("courseId", "==", courseId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toAssignment(d.id, d.data() as Record<string, unknown>));
}

export async function getAssignmentById(id: string): Promise<Assignment | null> {
  const snap = await getDoc(doc(db, ASSIGN_COL, id));
  if (!snap.exists()) return null;
  return toAssignment(snap.id, snap.data() as Record<string, unknown>);
}

export async function createAssignment(
  data: Omit<Assignment, "id" | "createdAt">
): Promise<string> {
  const ref = await addDoc(collection(db, ASSIGN_COL), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateAssignment(
  id: string,
  data: Partial<Omit<Assignment, "id" | "createdAt">>
): Promise<void> {
  await updateDoc(doc(db, ASSIGN_COL, id), data as Record<string, unknown>);
}

export async function deleteAssignment(id: string): Promise<void> {
  await deleteDoc(doc(db, ASSIGN_COL, id));
}

export async function getSubmissions(assignmentId: string): Promise<Submission[]> {
  const q = query(collection(db, SUB_COL), where("assignmentId", "==", assignmentId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toSubmission(d.id, d.data() as Record<string, unknown>));
}

export async function getStudentSubmissions(studentId: string): Promise<Submission[]> {
  const q = query(collection(db, SUB_COL), where("studentId", "==", studentId));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toSubmission(d.id, d.data() as Record<string, unknown>));
}

export async function createSubmission(
  data: Omit<Submission, "id" | "submittedAt">
): Promise<string> {
  const ref = await addDoc(collection(db, SUB_COL), {
    ...data,
    submittedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function gradeSubmission(
  id: string,
  grade: number,
  feedback: string
): Promise<void> {
  await updateDoc(doc(db, SUB_COL, id), { grade, feedback, status: "graded" });
}
