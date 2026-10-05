import { getSessionUser } from "@/app/lib/auth-cookies";
import { getI18n } from "@/app/lib/i18n/server";
import { getTeacherDashboard } from "@/app/lib/dashboard-data";
import { StatsCard } from "@/app/components/ui/StatsCard";
import { Card } from "@/app/components/ui/card";
import { BookOpen, Users, FileText } from "lucide-react";

export default async function TeacherDashboardPage() {
  const { t } = await getI18n();
  const user = await getSessionUser();
  const teacherId = user?.uid ?? "";

  const { myCourses } = await getTeacherDashboard(teacherId);

  const stats = [
    {
      title: t("myCourses"),
      value: myCourses.length,
      icon: <BookOpen size={22} />,
    },
    { title: t("students"), value: 0, icon: <Users size={22} /> },
    { title: t("assignments"), value: 0, icon: <FileText size={22} /> },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {t("welcomeMessage")}, {user?.name}
        </h1>
        <p className="text-slate-500">{t("teacherDashboardDescription")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <StatsCard key={s.title} title={s.title} value={s.value} icon={s.icon} />
        ))}
      </div>

      <Card>
        <h3 className="mb-4 text-lg font-semibold">{t("myCourses")}</h3>
        <ul className="space-y-3">
          {myCourses.map((c) => (
            <li key={c.id} className="text-slate-700">
              {c.name} — <span className="text-slate-400">{c.level}</span>
            </li>
          ))}
          {myCourses.length === 0 && (
            <li className="text-sm text-slate-500">{t("noCoursesAssigned")}</li>
          )}
        </ul>
      </Card>
    </div>
  );
}
