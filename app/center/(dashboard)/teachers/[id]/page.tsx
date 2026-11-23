import Image from "next/image";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/app/lib/auth-cookies";
import { ApiError } from "@/app/lib/api";
import { apiFetchServer } from "@/app/lib/api-server";
import { toCenterSettings, toTeacher } from "@/app/lib/mappers";
import { getI18n } from "@/app/lib/i18n/server";
import { Button } from "@/app/components/ui/button";
import { AttendanceQrCard } from "@/app/components/AttendanceQrCard";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/app/components/ui/card";
import {
  ArrowLeft,
  Mail,
  BookOpen,
  Building2,
  Calendar,
  User,
} from "lucide-react";

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

export default async function TeacherProfilePage({
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

  const [teacherRow, centerRow] = await Promise.all([
    fetchOr404(`/teachers/${id}`),
    fetchOr404(`/centers/${centerId}`),
  ]);

  if (!teacherRow) {
    return notFound();
  }

  const teacher = toTeacher(teacherRow);

  if (
    teacher.centerId !== centerId &&
    currentUser.role !== "super_admin"
  ) {
    return notFound();
  }

  const centerName =
    (typeof centerRow?.name === "string" ? centerRow.name : "") || t("noData");

  const settings = toCenterSettings(centerRow ?? {});
  const subjectMap = new Map(
    (settings?.subjects ?? []).map((s) => [s.id, s])
  );

  const assignments = teacher.subjectAssignments ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button href="/center/teachers" variant="outline" size="sm">
          <ArrowLeft size={16} className="mr-2" />
          {t("back")}
        </Button>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t("teacherProfile")}
        </h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
            {teacher.avatarUrl ? (
              <Image
                src={teacher.avatarUrl}
                alt={teacher.name}
                width={96}
                height={96}
                unoptimized
                className="h-24 w-24 rounded-full object-cover ring-4 ring-indigo-100 dark:ring-indigo-900"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-indigo-100 text-2xl font-bold text-indigo-700 ring-4 ring-indigo-50 dark:bg-indigo-900 dark:text-indigo-200">
                {getInitials(teacher.name)}
              </div>
            )}
            <div className="text-center sm:text-left">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                {teacher.name}
              </h2>
              <p className="text-slate-500">{t("teacher")}</p>
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
              <span className="font-medium">{teacher.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <Calendar size={18} className="text-slate-400" />
              <span className="text-slate-600 dark:text-slate-300">
                {t("joinedAt")}:
              </span>
              <span className="font-medium">
                {formatDate(teacher.createdAt)}
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
              <BookOpen size={18} />
              {t("academicInfo")}
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

        <AttendanceQrCard userId={teacher.id} name={teacher.name} />
      </div>
    </div>
  );
}
