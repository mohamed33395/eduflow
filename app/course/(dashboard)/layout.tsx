import { DashboardLayout } from "@/app/components/layout/DashboardLayout";
import { getI18n } from "@/app/lib/i18n/server";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Users,
  CheckCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CourseLayout({
  children,
}: LayoutProps<"/course">) {
  const { t } = await getI18n();

  return (
    <DashboardLayout
      allowedRole="course_owner"
      title={`${t("courses")} ${t("dashboard")}`}
      navItems={[
        {
          href: "/course",
          label: t("dashboard"),
          icon: <LayoutDashboard size={18} />,
        },
        {
          href: "/course/lessons",
          label: t("lessons"),
          icon: <BookOpen size={18} />,
        },
        {
          href: "/course/assignments",
          label: t("assignments"),
          icon: <FileText size={18} />,
        },
        {
          href: "/course/students",
          label: t("students"),
          icon: <Users size={18} />,
        },
        {
          href: "/course/progress",
          label: t("progress"),
          icon: <CheckCircle size={18} />,
        },
      ]}
    >
      {children}
    </DashboardLayout>
  );
}
