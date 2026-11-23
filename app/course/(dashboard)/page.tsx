import { getSessionUser } from "@/app/lib/auth-cookies";
import { ApiError } from "@/app/lib/api";
import { apiFetchServer } from "@/app/lib/api-server";
import {
  toAssignment,
  toCourse,
  toLesson,
  toStudent,
  unwrapList,
} from "@/app/lib/mappers";
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
import { DonutChart } from "@/app/components/ui/charts";
import { BookOpen, FileText, Users, Layout } from "lucide-react";
import type { Course, Lesson, Assignment, Student } from "@/app/types";

type Row = Record<string, unknown>;

export default async function CourseDashboardPage() {
  const { t } = await getI18n();
  const user = await getSessionUser();
  const courseId = user?.courseId ?? "";

  let course: Course | null = null;
  let lessons: Lesson[] = [];
  let assignments: Assignment[] = [];
  let students: Student[] = [];

  if (courseId) {
    const [courseRow, lessonsData, assignmentsData, studentsData] =
      await Promise.all([
        apiFetchServer<Row>(`/courses/${courseId}`).catch((err) =>
          err instanceof ApiError && err.status === 404 ? null : Promise.reject(err)
        ),
        apiFetchServer<unknown>(`/courses/${courseId}/lessons`).catch(() => []),
        apiFetchServer<unknown>(`/courses/${courseId}/assignments`).catch(() => []),
        apiFetchServer<unknown>(`/students?courseId=${courseId}&limit=100`).catch(() => []),
      ]);

    course = courseRow ? toCourse(courseRow) : null;
    lessons = unwrapList<Row>(lessonsData).map(toLesson);
    assignments = unwrapList<Row>(assignmentsData).map(toAssignment);
    students = unwrapList<Row>(studentsData).map(toStudent);
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
        <Card>
          <CardHeader>
            <CardTitle>{t("courseOverview")}</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart
              data={[
                { label: t("lessons"), value: lessons.length },
                { label: t("assignments"), value: assignments.length },
                { label: t("students"), value: students.length },
              ]}
              centerLabel={t("overview")}
            />
          </CardContent>
        </Card>

        <Card>
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
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
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
