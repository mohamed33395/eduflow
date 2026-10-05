import { getSessionUser } from "@/app/lib/auth-cookies";
import { getAdminDb } from "@/app/lib/firebase-admin";
import { getI18n } from "@/app/lib/i18n/server";
import { StatsCard } from "@/app/components/ui/StatsCard";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Table } from "@/app/components/ui/table";
import { BookOpen, FileText, Users, Layout } from "lucide-react";
import type { Course, Lesson, Assignment, Student } from "@/app/types";
import { Timestamp } from "firebase-admin/firestore";

function toCourse(id: string, data: Record<string, unknown>): Course {
  return {
    id,
    name: (data.name as string) ?? "",
    slug: (data.slug as string) ?? "",
    type: (data.type as string) ?? "",
    level: (data.level as Course["level"]) ?? "primary",
    gradeFrom: (data.gradeFrom as number) ?? 1,
    gradeTo: (data.gradeTo as number) ?? 12,
    description: (data.description as string) ?? "",
    content: data.content as string | undefined,
    coverImage: data.coverImage as string | undefined,
    ownerId: (data.ownerId as string) ?? "",
    centerId: data.centerId as string | undefined,
    status: (data.status as Course["status"]) ?? "active",
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : (data.createdAt as string) ?? "",
  };
}

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

function toStudent(id: string, data: Record<string, unknown>): Student {
  return {
    id,
    name: (data.name as string) ?? "",
    username: (data.username as string) ?? "",
    email: data.email as string | undefined,
    centerId: data.centerId as string | undefined,
    classId: data.classId as string | undefined,
    subjectIds: (data.subjectIds as string[]) ?? [],
    courses: (data.courses as string[]) ?? [],
    avatarUrl: data.avatarUrl as string | undefined,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : (data.createdAt as string) ?? "",
  };
}

export default async function CourseDashboardPage() {
  const { t } = await getI18n();
  const user = await getSessionUser();
  const courseId = user?.courseId ?? "";

  const adminDb = getAdminDb();

  let course: Course | null = null;
  let lessons: Lesson[] = [];
  let assignments: Assignment[] = [];
  let students: Student[] = [];

  if (adminDb && courseId) {
    const [courseSnap, lessonsSnap, assignmentsSnap, studentsSnap] =
      await Promise.all([
        adminDb.collection("courses").doc(courseId).get(),
        adminDb.collection("lessons").where("courseId", "==", courseId).get(),
        adminDb
          .collection("assignments")
          .where("courseId", "==", courseId)
          .get(),
        adminDb
          .collection("students")
          .where("courses", "array-contains", courseId)
          .get(),
      ]);

    course = courseSnap.exists
      ? toCourse(courseSnap.id, courseSnap.data() as Record<string, unknown>)
      : null;
    lessons = lessonsSnap.docs.map((d) =>
      toLesson(d.id, d.data() as Record<string, unknown>)
    );
    assignments = assignmentsSnap.docs.map((d) =>
      toAssignment(d.id, d.data() as Record<string, unknown>)
    );
    students = studentsSnap.docs.map((d) =>
      toStudent(d.id, d.data() as Record<string, unknown>)
    );
  }

  const stats = [
    {
      title: t("courses"),
      value: course?.name ?? t("nA"),
      icon: <Layout size={22} />,
    },
    { title: t("lessons"), value: lessons.length, icon: <BookOpen size={22} /> },
    {
      title: t("assignments"),
      value: assignments.length,
      icon: <FileText size={22} />,
    },
    { title: t("students"), value: students.length, icon: <Users size={22} /> },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {course?.name ?? t("courseDashboard")}
        </h1>
        <p className="text-slate-500">{t("courseDashboardDescription")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <StatsCard key={s.title} title={s.title} value={s.value} icon={s.icon} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("courseContent")}</CardTitle>
            <CardDescription>{course?.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-slate-700 dark:text-slate-200">
              {course?.content || t("noContentAddedYet")}
            </p>
          </CardContent>
          <CardFooter className="gap-3">
            <Button href="/course/lessons" variant="outline" size="sm">
              {t("lessons")}
            </Button>
            <Button href="/course/assignments" variant="outline" size="sm">
              {t("assignments")}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("enrolledStudents")}</CardTitle>
            <CardDescription>{t("courseDashboardDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table
              columns={[
                { key: "name", header: t("name") },
                { key: "username", header: t("username") },
              ]}
              rows={students.slice(0, 5)}
              keyExtractor={(row) => row.id}
              emptyText={t("notEnrolledInAnyCourses")}
            />
          </CardContent>
          <CardFooter className="justify-end">
            <Button href="/course/students" variant="outline" size="sm">
              {t("manage")}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("recentAssignments")}</CardTitle>
            <CardDescription>{t("assignments")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table
              columns={[
                { key: "title", header: t("title") },
                { key: "deadline", header: t("dueDate") },
              ]}
              rows={assignments.slice(0, 5)}
              keyExtractor={(row) => row.id}
              emptyText={t("noAssignmentsYet")}
            />
          </CardContent>
          <CardFooter className="justify-end">
            <Button href="/course/assignments" variant="outline" size="sm">
              {t("manage")}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
