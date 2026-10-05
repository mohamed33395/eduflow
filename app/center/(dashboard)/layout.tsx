import { DashboardLayout } from "@/app/components/layout/DashboardLayout";
import { getI18n } from "@/app/lib/i18n/server";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  ClipboardList,
  CreditCard,
  FileText,
  Settings,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CenterLayout({
  children,
}: LayoutProps<"/center">) {
  const { t } = await getI18n();

  return (
    <DashboardLayout
      allowedRole="center_owner"
      title={`${t("centers")} ${t("dashboard")}`}
      navItems={[
        { href: "/center", label: t("dashboard"), icon: <LayoutDashboard size={18} /> },
        { href: "/center/students", label: t("students"), icon: <Users size={18} /> },
        { href: "/center/teachers", label: t("teachers"), icon: <UserCheck size={18} /> },
        { href: "/center/attendance", label: t("attendance"), icon: <ClipboardList size={18} /> },
        { href: "/center/payments", label: t("payments"), icon: <CreditCard size={18} /> },
        { href: "/center/reports", label: t("reports"), icon: <FileText size={18} /> },
        { href: "/center/settings", label: t("settings"), icon: <Settings size={18} /> },
      ]}
    >
      {children}
    </DashboardLayout>
  );
}
