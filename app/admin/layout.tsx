import { DashboardLayout } from "@/app/components/layout/DashboardLayout";
import { getI18n } from "@/app/lib/i18n/server";
import {
  LayoutDashboard,
  Building2,
  BookOpen,
  Users,
  Settings,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: LayoutProps<"/admin">) {
  const { t } = await getI18n();

  return (
    <DashboardLayout
      allowedRole="super_admin"
      title={t("appName")}
      navItems={[
        {
          href: "/admin",
          label: t("dashboard"),
          icon: <LayoutDashboard size={18} />,
        },
        { href: "/admin/centers", label: t("centers"), icon: <Building2 size={18} /> },
        { href: "/admin/courses", label: t("courses"), icon: <BookOpen size={18} /> },
        { href: "/admin/users", label: t("users"), icon: <Users size={18} /> },
        {
          href: "/admin/settings",
          label: t("settings"),
          icon: <Settings size={18} />,
        },
      ]}
    >
      {children}
    </DashboardLayout>
  );
}
