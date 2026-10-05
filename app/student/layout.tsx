import { DashboardLayout } from "@/app/components/layout/DashboardLayout";
import { getI18n } from "@/app/lib/i18n/server";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  CheckCircle,
  GraduationCap,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StudentLayout({
  children,
}: LayoutProps<"/student">) {
  const { t } = await getI18n();

  return (
    <DashboardLayout
      allowedRole="student"
      title={`${t("students")} ${t("dashboard")}`}
      navItems={[
        {
          href: "/student",
          label: t("dashboard"),
          icon: <LayoutDashboard size={18} />,
        },
        {
          href: "/student/courses",
          label: t("myCourses"),
          icon: <BookOpen size={18} />,
        },
        {
          href: "/student/assignments",
          label: t("assignments"),
          icon: <FileText size={18} />,
        },
        {
          href: "/student/grades",
          label: t("grades"),
          icon: <GraduationCap size={18} />,
        },
        {
          href: "/student/attendance",
          label: t("attendance"),
          icon: <CheckCircle size={18} />,
        },
      ]}
    >
      {children}
    </DashboardLayout>
  );
}
