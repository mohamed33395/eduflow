import Image from "next/image";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth-cookies";
import { ApiError } from "@/app/lib/api";
import { apiFetchServer } from "@/app/lib/api-server";
import {
  toCenterSettings,
  toPayment,
  toStudent,
  unwrapList,
} from "@/app/lib/mappers";
import { getI18n } from "@/app/lib/i18n/server";
import { formatCurrency } from "@/app/lib/utils";
import { Button } from "@/app/components/ui/button";
import { AttendanceQrCard } from "@/app/components/AttendanceQrCard";
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
import type { Payment } from "@/app/types";

type Row = Record<string, unknown>;

async function fetchOr404(path: string): Promise<Row | null> {
  try {
    return await apiFetchServer<Row>(path);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

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

  if (!currentUser) {
    return notFound();
  }

  const centerId = currentUser.centerId;
  if (!centerId) {
    return notFound();
  }

  const studentRow = await fetchOr404(`/students/${id}`);
  if (!studentRow) {
    return notFound();
  }

  const student = toStudent(studentRow);

  if (
    student.centerId !== centerId &&
    currentUser.role !== "super_admin"
  ) {
    return notFound();
  }

  const [centerRow, classRow, teacherRow, paymentsData] = await Promise.all([
    fetchOr404(`/centers/${centerId}`),
    student.classId ? fetchOr404(`/classes/${student.classId}`) : null,
    student.teacherId ? fetchOr404(`/teachers/${student.teacherId}`) : null,
    apiFetchServer<unknown>(`/payments?studentId=${id}&limit=100`).catch(
      () => []
    ),
  ]);

  const centerName =
    (typeof centerRow?.name === "string" ? centerRow.name : "") || t("noData");

  const settings = toCenterSettings(centerRow ?? {});
  const subjectMap = new Map(
    (settings?.subjects ?? []).map((s) => [s.id, s])
  );

  const className =
    (typeof classRow?.name === "string" ? classRow.name : "") ||
    student.classId ||
    t("noData");

  const teacherUser = (teacherRow?.user as Row | undefined) ?? {};
  const teacherName =
    (typeof teacherUser.name === "string" ? teacherUser.name : "") ||
    student.teacherId ||
    t("noData");

  const payments: Payment[] = unwrapList<Row>(paymentsData).map(toPayment);

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
              <Image
                src={student.avatarUrl}
                alt={student.name}
                width={96}
                height={96}
                unoptimized
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

        <AttendanceQrCard userId={student.id} name={student.name} />
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
