import { getSessionUser } from "@/app/lib/auth-cookies";
import { getI18n } from "@/app/lib/i18n/server";
import { getStudentDashboard } from "@/app/lib/dashboard-data";
import { StatsCard } from "@/app/components/ui/StatsCard";
import { Card } from "@/app/components/ui/card";
import { DonutChart } from "@/app/components/ui/charts";
import { AttendanceQrCard } from "@/app/components/AttendanceQrCard";
import { BookOpen, FileText, GraduationCap } from "lucide-react";

export default async function StudentDashboardPage() {
  const { t } = await getI18n();
  const user = await getSessionUser();
  const studentId = user?.uid ?? "";

  const { courses: myCourses, totalAssignments, totalLessons } =
    await getStudentDashboard(studentId);

  const stats = [
    {
      title: t("myCourses"),
      value: myCourses.length,
      icon: <BookOpen size={22} />,
    },
    {
      title: t("lessons"),
      value: totalLessons,
      icon: <GraduationCap size={22} />,
    },
    {
      title: t("assignments"),
      value: totalAssignments,
      icon: <FileText size={22} />,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t("welcomeMessage")}, {user?.name}
        </h1>
        <p className="text-slate-500">{t("keepUpGoodWork")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <StatsCard key={s.title} title={s.title} value={s.value} icon={s.icon} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <AttendanceQrCard
          userId={studentId}
          name={user?.name ?? ""}
        />
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold">{t("overview")}</h3>
          <DonutChart
            data={[
              { label: t("myCourses"), value: myCourses.length },
              { label: t("lessons"), value: totalLessons },
              { label: t("assignments"), value: totalAssignments },
            ]}
            centerLabel={t("overview")}
          />
        </Card>

        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold">{t("myCourses")}</h3>
          <ul className="space-y-3">
            {myCourses.map((c) => (
              <li key={c.id} className="text-slate-700 dark:text-slate-300">
                {c.name} — <span className="text-slate-400">{t(c.level)}</span>
              </li>
            ))}
            {myCourses.length === 0 && (
              <li className="text-sm text-slate-500">
                {t("notEnrolledInAnyCourses")}
              </li>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
