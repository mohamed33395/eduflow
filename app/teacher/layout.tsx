import { DashboardLayout } from "@/app/components/layout/DashboardLayout";
import { getI18n } from "@/app/lib/i18n/server";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  ClipboardList,
  Users,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TeacherLayout({
  children,
}: LayoutProps<"/teacher">) {
  const { t } = await getI18n();

  return (
    <DashboardLayout
      allowedRole="teacher"
      title={`${t("teachers")} ${t("dashboard")}`}
      navItems={[
        {
          href: "/teacher",
          label: t("dashboard"),
          icon: <LayoutDashboard size={18} />,
        },
        {
          href: "/teacher/courses",
          label: t("myCourses"),
          icon: <BookOpen size={18} />,
        },
        {
          href: "/teacher/assignments",
          label: t("assignments"),
          icon: <FileText size={18} />,
        },
        {
          href: "/teacher/attendance",
          label: t("attendance"),
          icon: <ClipboardList size={18} />,
        },
        {
          href: "/teacher/submissions",
          label: t("submissions"),
          icon: <Users size={18} />,
        },
      ]}
    >
      {children}
    </DashboardLayout>
  );
}
