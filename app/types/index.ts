export type UserRole =
  | "super_admin"
  | "center_owner"
  | "course_owner"
  | "teacher"
  | "student";

export interface AppUser {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  centerId?: string;
  courseId?: string;
  avatarUrl?: string;
  createdAt: string;
}

export type CenterStatus = "active" | "inactive";

export interface CenterSubject {
  id: string;
  level: EducationLevel;
  grade: number;
  track?: string;
  name: string;
  price: number;
}

export interface SubjectAssignment {
  subjectId: string;
  level: EducationLevel;
  gradeFrom: number;
  gradeTo: number;
  track?: string;
}

export interface CenterGradeGroup {
  level: EducationLevel;
  grade: number;
  count: number;
}

export interface CenterYearPackage {
  id: string;
  level: EducationLevel;
  grade: number;
  track?: string;
  teacher?: string;
  subjects: CenterSubject[];
  bundlePrice?: number;
  maxStudentsPerClass: number;
  groupsPerYear: CenterGradeGroup[];
}

export interface CenterSettings {
  subjects: CenterSubject[];
  bundlePrice?: number;
  maxStudentsPerClass: number;
  groupsPerYear: CenterGradeGroup[];
  years?: CenterYearPackage[];
}

export type BillingStatus = "PENDING" | "PAID" | "WAIVED";

export interface CenterBilling {
  id: string;
  centerId: string;
  year: number;
  month: number;
  amount: number;
  status: BillingStatus;
  paidAt?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface Center {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  email: string;
  phone?: string;
  address?: string;
  status: CenterStatus;
  ownerId: string;
  /** Monthly platform fee owed by the center (super admin only). */
  monthlyFee?: number;
  settings?: CenterSettings;
  createdAt: string;
  _count?: { studentProfiles: number; teacherProfiles: number; courses: number };
}

export type EducationLevel =
  | "kindergarten"
  | "primary"
  | "middle"
  | "high";

export interface Course {
  id: string;
  name: string;
  slug: string;
  type: string;
  level: EducationLevel;
  gradeFrom: number;
  gradeTo: number;
  description: string;
  content?: string;
  coverImage?: string;
  ownerId: string;
  centerId?: string;
  status: "active" | "inactive";
  createdAt: string;
}

export interface Class {
  id: string;
  name: string;
  level: EducationLevel;
  gradeFrom: number;
  gradeTo: number;
  centerId?: string;
  teacherIds?: string[];
  status: "active" | "inactive";
  createdAt: string;
}

export interface Subject {
  id: string;
  name: string;
  classId?: string;
  centerId?: string;
  teacherId?: string;
  description?: string;
  status: "active" | "inactive";
  createdAt: string;
}

export interface Student {
  id: string;
  name: string;
  username: string;
  email?: string;
  phone?: string;
  parentName?: string;
  parentPhone?: string;
  centerId?: string;
  level?: EducationLevel;
  grade?: number;
  classId?: string;
  subjectIds?: string[];
  subjectAssignments?: SubjectAssignment[];
  teacherId?: string;
  gender?: "male" | "female";
  courses: string[];
  avatarUrl?: string;
  createdAt: string;
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  assignedCourses: string[];
  assignedClassIds?: string[];
  assignedSubjectIds?: string[];
  subjectAssignments?: SubjectAssignment[];
  centerId?: string;
  avatarUrl?: string;
  /** monthly salary model */
  compensationType?: "fixed" | "percentage";
  fixedAmount?: number;
  commissionPercent?: number;
  createdAt: string;
}

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  videoUrl?: string;
  files: LessonFile[];
  order: number;
  createdAt: string;
}

export interface LessonFile {
  name: string;
  url: string;
  type: "pdf" | "image" | "video" | "other";
}

export interface Assignment {
  id: string;
  courseId: string;
  teacherId: string;
  title: string;
  description: string;
  deadline: string;
  maxGrade?: number;
  createdAt: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  fileUrl?: string;
  text?: string;
  grade?: number;
  feedback?: string;
  submittedAt: string;
  status: "pending" | "graded";
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  courseId?: string;
  date: string;
  status: "present" | "absent" | "late";
}

export interface Payment {
  id: string;
  studentId: string;
  courseId: string;
  amount: number;
  paid: number;
  remaining: number;
  dueDate?: string;
  createdAt: string;
  /** denormalized for display/filtering */
  studentName?: string;
  courseName?: string;
  studentLevel?: EducationLevel;
  studentGrade?: number;
}

export type PayoutStatus = "pending" | "approved" | "paid";

export interface TeacherPayout {
  id: string;
  teacherId: string;
  teacherName?: string;
  periodStart: string;
  periodEnd: string;
  compensationType: "fixed" | "percentage";
  fixedAmount?: number;
  commissionPercent?: number;
  collectedRevenue: number;
  dueAmount: number;
  status: PayoutStatus;
  notes?: string;
  paidAt?: string;
  createdAt: string;
}

export interface DashboardStats {
  totalCenters: number;
  totalCourses: number;
  totalStudents: number;
  totalTeachers: number;
  totalRevenue: number;
}

// ── Tasks (exams) ──────────────────────────────────────────────────

export type TaskStudentStatus = "pending" | "submitted" | "rejected" | "graded";

export interface TaskStats {
  notified: number;
  submitted: number;
  graded: number;
  rejected: number;
  pending: number;
}

export interface CenterTask {
  id: string;
  title: string;
  centerId: string;
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
  lessonId?: string;
  lessonTitle?: string;
  examFileUrl: string;
  createdAt: string;
  stats: TaskStats;
}

export interface TaskStudentRow {
  studentId: string;
  name: string;
  parentPhone?: string;
  status: TaskStudentStatus;
  submissionId?: string;
  fileUrl?: string;
  grade?: number;
  feedback?: string;
  attempts: number;
  submittedAt?: string;
  resultSentAt?: string;
}

export interface TaskDetail extends CenterTask {
  students: TaskStudentRow[];
}

export interface TaskFormData {
  teachers: { id: string; name: string }[];
  lessons: { id: string; title: string }[];
  studentCount: number;
}

export interface MyTaskItem {
  recipientId: string;
  task: {
    id: string;
    title: string;
    examFileUrl: string;
    subject?: { id: string; name: string };
    lesson?: { id: string; title: string };
    teacher?: { user?: { name: string } };
    createdAt: string;
  };
  mySubmission: {
    id: string;
    fileUrl: string;
    status: TaskStudentStatus;
    grade?: number;
    feedback?: string;
    attempts: number;
    submittedAt: string;
    resultSentAt?: string;
  } | null;
  status: TaskStudentStatus;
}

export interface ReviewSubmission {
  id: string;
  taskId: string;
  fileUrl: string;
  status: TaskStudentStatus;
  grade?: number;
  feedback?: string;
  attempts: number;
  submittedAt: string;
  resultSentAt?: string;
  studentId: string;
  studentName: string;
  parentPhone?: string;
  taskTitle: string;
  subjectName: string;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
  readAt?: string;
  createdAt: string;
}
