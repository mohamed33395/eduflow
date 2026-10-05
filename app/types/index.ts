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
  settings?: CenterSettings;
  createdAt: string;
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
}

export interface DashboardStats {
  totalCenters: number;
  totalCourses: number;
  totalStudents: number;
  totalTeachers: number;
  totalRevenue: number;
}
