import { api, qs } from "@/app/lib/api";
import { unwrapList } from "@/app/lib/mappers";
import type {
  CenterTask,
  MyTaskItem,
  ReviewSubmission,
  TaskDetail,
  TaskFormData,
  TaskStats,
  TaskStudentRow,
  TaskStudentStatus,
} from "@/app/types";

type Row = Record<string, unknown>;

// ── small local helpers (same style as lib/mappers) ────────────────
const str = (v: unknown, fallback = ""): string =>
  typeof v === "string" ? v : fallback;
const num = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;
const row = (v: unknown): Row => (v && typeof v === "object" ? (v as Row) : {});
const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

const statusOf = (v: unknown): TaskStudentStatus => {
  const s = str(v).toLowerCase();
  return s === "submitted" || s === "rejected" || s === "graded"
    ? s
    : "pending";
};

function toTaskStats(v: unknown): TaskStats {
  const r = row(v);
  return {
    notified: num(r.notified) ?? 0,
    submitted: num(r.submitted) ?? 0,
    graded: num(r.graded) ?? 0,
    rejected: num(r.rejected) ?? 0,
    pending: num(r.pending) ?? 0,
  };
}

function toCenterTask(r: Row): CenterTask {
  const subject = row(r.subject);
  const lesson = row(r.lesson);
  const teacher = row(r.teacher);
  return {
    id: str(r.id),
    title: str(r.title),
    centerId: str(r.centerId),
    subjectId: str(r.subjectId),
    subjectName: str(subject.name),
    teacherId: str(r.teacherId),
    teacherName: str(row(teacher.user).name),
    lessonId: r.lessonId ? str(r.lessonId) : undefined,
    lessonTitle: lesson.title ? str(lesson.title) : undefined,
    examFileUrl: str(r.examFileUrl),
    createdAt: str(r.createdAt),
    stats: toTaskStats(r.stats),
  };
}

function toTaskStudentRow(r: Row): TaskStudentRow {
  return {
    studentId: str(r.studentId),
    name: str(r.name),
    parentPhone: r.parentPhone ? str(r.parentPhone) : undefined,
    status: statusOf(r.status),
    submissionId: r.submissionId ? str(r.submissionId) : undefined,
    fileUrl: r.fileUrl ? str(r.fileUrl) : undefined,
    grade: num(r.grade),
    feedback: r.feedback ? str(r.feedback) : undefined,
    attempts: num(r.attempts) ?? 0,
    submittedAt: r.submittedAt ? str(r.submittedAt) : undefined,
    resultSentAt: r.resultSentAt ? str(r.resultSentAt) : undefined,
  };
}

// ── center ─────────────────────────────────────────────────────────

export async function getTaskFormData(subjectId: string): Promise<TaskFormData> {
  const data = await api.get<Row>(`/tasks/form-data${qs({ subjectId })}`);
  return {
    teachers: arr<Row>(data.teachers).map((t) => ({
      id: str(t.id),
      name: str(t.name),
    })),
    lessons: arr<Row>(data.lessons).map((l) => ({
      id: str(l.id),
      title: str(l.title),
    })),
    studentCount: num(data.studentCount) ?? 0,
  };
}

export async function getTasks(centerId?: string): Promise<CenterTask[]> {
  const data = await api.get<unknown>(`/tasks${qs({ centerId })}`);
  return unwrapList<Row>(data).map(toCenterTask);
}

export async function getTask(id: string): Promise<TaskDetail> {
  const data = await api.get<Row>(`/tasks/${id}`);
  return {
    ...toCenterTask(data),
    students: arr<Row>(data.students).map(toTaskStudentRow),
  };
}

export async function createTask(input: {
  title: string;
  subjectId: string;
  teacherId: string;
  lessonId?: string;
  examFileUrl: string;
}): Promise<CenterTask> {
  const data = await api.post<Row>("/tasks", input);
  return toCenterTask(data);
}

// ── student ────────────────────────────────────────────────────────

export async function getMyTasks(): Promise<MyTaskItem[]> {
  const data = await api.get<unknown>("/tasks/mine");
  return unwrapList<Row>(data).map((r) => {
    const sub = r.mySubmission ? row(r.mySubmission) : null;
    return {
      recipientId: str(r.recipientId),
      task: row(r.task) as MyTaskItem["task"],
      mySubmission: sub
        ? {
            id: str(sub.id),
            fileUrl: str(sub.fileUrl),
            status: statusOf(sub.status),
            grade: num(sub.grade),
            feedback: sub.feedback ? str(sub.feedback) : undefined,
            attempts: num(sub.attempts) ?? 1,
            submittedAt: str(sub.submittedAt),
            resultSentAt: sub.resultSentAt ? str(sub.resultSentAt) : undefined,
          }
        : null,
      status: statusOf(r.status),
    };
  });
}

export async function submitTaskSolution(
  taskId: string,
  fileUrl: string
): Promise<void> {
  await api.post(`/tasks/${taskId}/submissions`, { fileUrl });
}

// ── teacher review ─────────────────────────────────────────────────

export async function getReviewQueue(): Promise<ReviewSubmission[]> {
  const data = await api.get<unknown>("/tasks/review-queue");
  return unwrapList<Row>(data).map((r) => {
    const student = row(r.student);
    const task = row(r.task);
    return {
      id: str(r.id),
      taskId: str(r.taskId),
      fileUrl: str(r.fileUrl),
      status: statusOf(r.status),
      grade: num(r.grade),
      feedback: r.feedback ? str(r.feedback) : undefined,
      attempts: num(r.attempts) ?? 1,
      submittedAt: str(r.submittedAt),
      resultSentAt: r.resultSentAt ? str(r.resultSentAt) : undefined,
      studentId: str(r.studentId || student.id),
      studentName: str(row(student.user).name),
      parentPhone: student.parentPhone ? str(student.parentPhone) : undefined,
      taskTitle: str(task.title),
      subjectName: str(row(task.subject).name),
    };
  });
}

export async function reviewTaskSubmission(
  id: string,
  input: { action: "accept" | "reject"; grade?: number; feedback?: string }
): Promise<void> {
  await api.patch(`/task-submissions/${id}/review`, input);
}

export interface SendResultResponse {
  sent: boolean;
  manual: boolean;
  waUrl?: string;
  parentPhone?: string;
  resultSentAt?: string;
}

export async function sendTaskResult(
  submissionId: string,
  markOnly = false
): Promise<SendResultResponse> {
  return api.post<SendResultResponse>(
    `/task-submissions/${submissionId}/send-result`,
    markOnly ? { markOnly: true } : {}
  );
}
