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

/**
 * Public landing-page content ("الملف التعريفي") editable from the
 * center/course dashboards. Mirrors `LandingProfileDto` on the backend —
 * update both together. Stored as JSON; extend without migrations.
 */
export interface LandingFeature {
  title: string;
  description?: string;
}

/** A highlighted student in the landing "top students" section. */
export interface LandingTopStudent {
  name: string;
  /** Achievement / grade — e.g. "الأول على المحافظة". */
  subtitle?: string;
  image?: string;
}

export interface LandingSocials {
  facebook?: string;
  instagram?: string;
  youtube?: string;
  tiktok?: string;
  telegram?: string;
}

/**
 * Overridable UI strings on the public landing page. Any missing key falls
 * back to the visitor's i18n default — so every word on the page is editable
 * from the profile form without duplicating defaults.
 */
export interface LandingLabels {
  featuresTitle?: string;
  aboutTitle?: string;
  galleryTitle?: string;
  topStudentsTitle?: string;
  contactTitle?: string;
  bookingTitle?: string;
  bookingSubtitle?: string;
  bookingRoleStudent?: string;
  bookingRoleTeacher?: string;
  bookingNameLabel?: string;
  bookingPhoneLabel?: string;
  bookingEmailLabel?: string;
  bookingMessageLabel?: string;
  bookingSubmitLabel?: string;
  bookingSuccess?: string;
}

/** Per-section background-color overrides on the public landing page. */
export interface LandingColors {
  heroBg?: string;
  featuresBg?: string;
  aboutBg?: string;
  topStudentsBg?: string;
  galleryBg?: string;
  bookingBg?: string;
  contactBg?: string;
  footerBg?: string;
  /** Background of the inner white cards. */
  cardBg?: string;
  /** Section headings color. */
  titleColor?: string;
  /** Body/description text color. */
  textColor?: string;
}

export interface LandingProfile {
  /** false = public page hidden. Missing = visible. */
  published?: boolean;
  headline?: string;
  tagline?: string;
  /** Meta line under the headline (overrides the generated course meta). */
  subtitle?: string;
  about?: string;
  ctaLabel?: string;
  /** Absolute URL or app-relative path like "/login". */
  ctaUrl?: string;
  /** false = hide the hero call-to-action button. Missing = visible. */
  ctaEnabled?: boolean;
  phone?: string;
  whatsapp?: string;
  address?: string;
  website?: string;
  heroImage?: string;
  /** Brand mark beside the hero title — falls back to the entity logo. */
  heroLogo?: string;
  gallery?: string[];
  features?: LandingFeature[];
  topStudents?: LandingTopStudent[];
  socials?: LandingSocials;
  accentColor?: string;
  /** false = hide the booking-request form. Missing = visible. */
  bookingEnabled?: boolean;
  footerText?: string;
  labels?: LandingLabels;
  colors?: LandingColors;
}

/** Booking/join request submitted from a public landing page. */
export type LandingRequestRole = "student" | "teacher";
export type LandingRequestStatus =
  | "pending"
  | "contacted"
  | "accepted"
  | "rejected";

export interface LandingRequest {
  id: string;
  centerId?: string | null;
  courseId?: string | null;
  role: LandingRequestRole;
  name: string;
  phone: string;
  email?: string | null;
  message?: string | null;
  status: LandingRequestStatus;
  createdAt: string;
  course?: { name: string; slug: string } | null;
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
  /** Public landing-page profile ("الملف التعريفي"). */
  landing?: LandingProfile;
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
  /** Public landing-page profile ("الملف التعريفي"). */
  landing?: LandingProfile;
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

export type PaymentMethodKind = "bank" | "wallet" | "cash";

export interface PaymentMethod {
  id: string;
  kind: PaymentMethodKind;
  label: string;
  account: string;
  details?: string;
  isActive: boolean;
  createdAt: string;
}

export type PaymentProofStatus = "pending" | "approved" | "rejected";

export interface PaymentProof {
  id: string;
  paymentId: string;
  amount: number;
  reference?: string;
  screenshot?: string;
  status: PaymentProofStatus;
  notes?: string;
  createdAt: string;
  methodId?: string;
  methodKind?: PaymentMethodKind;
  methodLabel?: string;
  methodAccount?: string;
  studentId?: string;
  studentName?: string;
  courseName?: string;
}
