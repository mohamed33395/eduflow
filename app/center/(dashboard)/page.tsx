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
import { formatCurrency } from "@/app/lib/utils";
import { Users, UserCheck, DollarSign, Building2 } from "lucide-react";
import type { Center, Student, Teacher, Payment, SubjectAssignment } from "@/app/types";
import { Timestamp } from "firebase-admin/firestore";

function toCenter(id: string, data: Record<string, unknown>): Center {
  return {
    id,
    name: (data.name as string) ?? "",
    slug: (data.slug as string) ?? "",
    logo: data.logo as string | undefined,
    email: (data.email as string) ?? "",
    phone: data.phone as string | undefined,
    address: data.address as string | undefined,
    status: (data.status as Center["status"]) ?? "active",
    ownerId: (data.ownerId as string) ?? "",
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
    subjectAssignments:
      (data.subjectAssignments as unknown as SubjectAssignment[]) ?? [],
    courses: (data.courses as string[]) ?? [],
    avatarUrl: data.avatarUrl as string | undefined,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : (data.createdAt as string) ?? "",
  };
}

function toTeacher(id: string, data: Record<string, unknown>): Teacher {
  return {
    id,
    name: (data.name as string) ?? "",
    email: (data.email as string) ?? "",
    assignedCourses: (data.assignedCourses as string[]) ?? [],
    assignedClassIds: (data.assignedClassIds as string[]) ?? [],
    assignedSubjectIds: (data.assignedSubjectIds as string[]) ?? [],
    subjectAssignments:
      (data.subjectAssignments as unknown as SubjectAssignment[]) ?? [],
    centerId: data.centerId as string | undefined,
    avatarUrl: data.avatarUrl as string | undefined,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : (data.createdAt as string) ?? "",
  };
}

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

export default async function CenterDashboardPage() {
  const { t } = await getI18n();
  const user = await getSessionUser();
  const centerId = user?.centerId ?? "";

  const adminDb = getAdminDb();

  let center: Center | null = null;
  let students: Student[] = [];
  let teachers: Teacher[] = [];
  let payments: Payment[] = [];

  if (adminDb && centerId) {
    const [centerSnap, studentsSnap, teachersSnap, paymentsSnap] =
      await Promise.all([
        adminDb.collection("centers").doc(centerId).get(),
        adminDb.collection("students").where("centerId", "==", centerId).get(),
        adminDb.collection("teachers").where("centerId", "==", centerId).get(),
        adminDb.collection("payments").get(),
      ]);

    center = centerSnap.exists
      ? toCenter(centerSnap.id, centerSnap.data() as Record<string, unknown>)
      : null;
    students = studentsSnap.docs.map((d) =>
      toStudent(d.id, d.data() as Record<string, unknown>)
    );
    teachers = teachersSnap.docs.map((d) =>
      toTeacher(d.id, d.data() as Record<string, unknown>)
    );
    payments = paymentsSnap.docs.map((d) =>
      toPayment(d.id, d.data() as Record<string, unknown>)
    );
  }

  const paid = payments
    .filter((p) => students.some((s) => s.id === p.studentId))
    .reduce((sum, p) => sum + p.paid, 0);

  const stats = [
    {
      title: t("myCenter"),
      value: center?.name ?? t("nA"),
      icon: <Building2 size={22} />,
    },
    { title: t("students"), value: students.length, icon: <Users size={22} /> },
    {
      title: t("teachers"),
      value: teachers.length,
      icon: <UserCheck size={22} />,
    },
    {
      title: t("revenue"),
      value: formatCurrency(paid),
      icon: <DollarSign size={22} />,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {center?.name ?? t("centerDashboard")}
        </h1>
        <p className="text-slate-500">{t("centerDashboardDescription")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <StatsCard key={s.title} title={s.title} value={s.value} icon={s.icon} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("recentStudents")}</CardTitle>
            <CardDescription>{t("enrolledStudents")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table
              columns={[
                { key: "name", header: t("name") },
                { key: "username", header: t("username") },
              ]}
              rows={students.slice(0, 5)}
              keyExtractor={(row) => row.id}
              emptyText={t("noStudentsYet")}
            />
          </CardContent>
          <CardFooter className="justify-end">
            <Button href="/center/students" variant="outline" size="sm">
              {t("manage")}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("recentTeachers")}</CardTitle>
            <CardDescription>{t("teacherDashboardDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Table
              columns={[
                { key: "name", header: t("name") },
                { key: "email", header: t("email") },
              ]}
              rows={teachers.slice(0, 5)}
              keyExtractor={(row) => row.id}
              emptyText={t("noTeachersYet")}
            />
          </CardContent>
          <CardFooter className="justify-end">
            <Button href="/center/teachers" variant="outline" size="sm">
              {t("manage")}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
