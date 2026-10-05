import { notFound } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth-cookies";
import { getAdminDb } from "@/app/lib/firebase-admin";
import { getI18n } from "@/app/lib/i18n/server";
import { sanitizeSettings } from "@/app/lib/center-settings";
import { formatCurrency } from "@/app/lib/utils";
import { Button } from "@/app/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/app/components/ui/card";
import { Table } from "@/app/components/ui/table";
import {
  ArrowLeft,
  Mail,
  Phone,
  BookOpen,
  Building2,
  Calendar,
  User,
  Users,
  GraduationCap,
  DollarSign,
} from "lucide-react";
import { Timestamp } from "firebase-admin/firestore";
import type {
  Student,
  Teacher,
  Class,
  Payment,
  SubjectAssignment,
} from "@/app/types";

type PageParams = Promise<{ id: string }>;

function formatDate(value: string | undefined) {
  if (!value) return "-";
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return "-";
    return d.toISOString().split("T")[0];
  } catch {
    return "-";
  }
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

export default async function StudentProfilePage({
  params,
}: {
  params: PageParams;
}) {
  const { id } = await params;
  const { t } = await getI18n();
  const currentUser = await getSessionUser();
  const adminDb = getAdminDb();

  if (!currentUser || !adminDb) {
    return notFound();
  }

  const centerId = currentUser.centerId;
  if (!centerId) {
    return notFound();
  }

  const studentSnap = await adminDb.collection("students").doc(id).get();
  if (!studentSnap.exists) {
    return notFound();
  }

  const data = studentSnap.data() as Record<string, unknown>;
  const studentCenterId = (data.centerId as string) || "";

  if (
    studentCenterId !== centerId &&
    currentUser.role !== "super_admin"
  ) {
    return notFound();
  }

  const classId = (data.classId as string) || undefined;
  const teacherId = (data.teacherId as string) || undefined;

  const [centerSnap, classSnap, teacherSnap, paymentsSnap] =
    await Promise.all([
      adminDb.collection("centers").doc(centerId).get(),
      classId ? adminDb.collection("classes").doc(classId).get() : null,
      teacherId ? adminDb.collection("teachers").doc(teacherId).get() : null,
      adminDb
        .collection("payments")
        .where("studentId", "==", id)
        .get()
        .catch(() => null),
    ]);

  const centerData = centerSnap.exists
    ? (centerSnap.data() as Record<string, unknown>)
    : null;
  const centerName = (centerData?.name as string) || t("noData");

  const rawSettings = (centerData?.settings as unknown) ?? null;
  const settings = sanitizeSettings(rawSettings);
  const subjectMap = new Map(settings.subjects.map((s) => [s.id, s]));

  const student: Student = {
    id: studentSnap.id,
    name: (data.name as string) ?? "",
    username: (data.username as string) ?? "",
    email: data.email as string | undefined,
    phone: data.phone as string | undefined,
    parentName: data.parentName as string | undefined,
    parentPhone: data.parentPhone as string | undefined,
    centerId: data.centerId as string | undefined,
    level: data.level as Student["level"],
    grade: typeof data.grade === "number" ? data.grade : undefined,
    classId: data.classId as string | undefined,
    subjectIds: (data.subjectIds as string[]) ?? [],
    subjectAssignments:
      (data.subjectAssignments as SubjectAssignment[]) ?? [],
    teacherId: data.teacherId as string | undefined,
    gender: data.gender as Student["gender"],
    courses: (data.courses as string[]) ?? [],
    avatarUrl: data.avatarUrl as string | undefined,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate().toISOString()
        : (data.createdAt as string) ?? "",
  };

  const classData = classSnap?.exists
    ? (classSnap.data() as Record<string, unknown>)
    : null;
  const className = classData
    ? ((classData.name as string) || student.classId)
    : student.classId || t("noData");

  const teacherData = teacherSnap?.exists
    ? (teacherSnap.data() as Record<string, unknown>)
    : null;
  const teacherName = teacherData
    ? ((teacherData.name as string) || student.teacherId)
    : student.teacherId || t("noData");

  const payments: Payment[] =
    paymentsSnap?.docs.map((d) => {
      const p = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        studentId: (p.studentId as string) ?? "",
        courseId: (p.courseId as string) ?? "",
        amount: typeof p.amount === "number" ? p.amount : 0,
        paid: typeof p.paid === "number" ? p.paid : 0,
        remaining: typeof p.remaining === "number" ? p.remaining : 0,
        dueDate: p.dueDate as string | undefined,
        createdAt:
          p.createdAt instanceof Timestamp
            ? p.createdAt.toDate().toISOString()
            : (p.createdAt as string) ?? "",
      };
    }) ?? [];

  const stageLabel =
    student.level && student.grade
      ? `${student.grade} ${t(student.level)}`
      : t("noData");

  const assignments = student.subjectAssignments ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button href="/center/students" variant="outline" size="sm">
          <ArrowLeft size={16} className="mr-2" />
          {t("back")}
        </Button>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t("studentProfile")}
        </h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            {student.avatarUrl ? (
              <img
                src={student.avatarUrl}
                alt={student.name}
                className="h-24 w-24 rounded-full object-cover ring-4 ring-indigo-100 dark:ring-indigo-900"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-indigo-100 text-2xl font-bold text-indigo-700 ring-4 ring-indigo-50 dark:bg-indigo-900 dark:text-indigo-200">
                {getInitials(student.name)}
              </div>
            )}
            <div className="text-center sm:text-left">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {student.name}
              </h2>
              <p className="text-slate-500">{student.username}</p>
              <p className="mt-1 text-sm font-medium text-indigo-600 dark:text-indigo-400">
                {stageLabel}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User size={18} />
              {t("personalInfo")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <Mail size={18} className="text-slate-400" />
              <span className="text-slate-600 dark:text-slate-300">
                {t("email")}:
              </span>
              <span className="font-medium">
                {student.email || t("noData")}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Phone size={18} className="text-slate-400" />
              <span className="text-slate-600 dark:text-slate-300">
                {t("phone")}:
              </span>
              <span className="font-medium">
                {student.phone || t("noData")}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Calendar size={18} className="text-slate-400" />
              <span className="text-slate-600 dark:text-slate-300">
                {t("joinedAt")}:
              </span>
              <span className="font-medium">
                {formatDate(student.createdAt)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Building2 size={18} className="text-slate-400" />
              <span className="text-slate-600 dark:text-slate-300">
                {t("centerName")}:
              </span>
              <span className="font-medium">{centerName}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users size={18} />
              {t("parentInfo")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <User size={18} className="text-slate-400" />
              <span className="text-slate-600 dark:text-slate-300">
                {t("parentName")}:
              </span>
              <span className="font-medium">
                {student.parentName || t("noData")}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Phone size={18} className="text-slate-400" />
              <span className="text-slate-600 dark:text-slate-300">
                {t("parentPhone")}:
              </span>
              <span className="font-medium">
                {student.parentPhone || t("noData")}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <GraduationCap size={18} />
              {t("academicInfo")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <BookOpen size={18} className="text-slate-400" />
              <span className="text-slate-600 dark:text-slate-300">
                {t("stage")}:
              </span>
              <span className="font-medium">{stageLabel}</span>
            </div>
            <div className="flex items-center gap-3">
              <Users size={18} className="text-slate-400" />
              <span className="text-slate-600 dark:text-slate-300">
                {t("classGroup")}:
              </span>
              <span className="font-medium">{className}</span>
            </div>
            <div className="flex items-center gap-3">
              <User size={18} className="text-slate-400" />
              <span className="text-slate-600 dark:text-slate-300">
                {t("assignedTeacher")}:
              </span>
              <span className="font-medium">{teacherName}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BookOpen size={18} />
              {t("subjects")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {assignments.length === 0 ? (
              <p className="text-slate-500">{t("noSubjectsAssigned")}</p>
            ) : (
              <ul className="space-y-2">
                {assignments.map((a) => {
                  const subject = subjectMap.get(a.subjectId);
                  const subjectName = subject?.name ?? a.subjectId;
                  const level = subject ? t(subject.level) : t(a.level);
                  return (
                    <li
                      key={a.subjectId}
                      className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800"
                    >
                      <span className="font-medium">{subjectName}</span>
                      <span className="text-sm text-slate-500">
                        {level} {a.gradeFrom}-{a.gradeTo}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign size={18} />
            {t("payments")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table
            columns={[
              { key: "amount", header: t("paymentAmount") },
              { key: "paid", header: t("paidAmount") },
              {
                key: "remaining",
                header: t("remainingAmount"),
                render: (row: Payment) => (
                  <span className="font-medium text-red-600">
                    {formatCurrency(row.remaining)}
                  </span>
                ),
              },
              {
                key: "dueDate",
                header: t("dueDate"),
                render: (row: Payment) => formatDate(row.dueDate),
              },
            ]}
            rows={payments}
            keyExtractor={(row) => row.id}
            emptyText={t("noPaymentsYet")}
          />
        </CardContent>
      </Card>
    </div>
  );
}
