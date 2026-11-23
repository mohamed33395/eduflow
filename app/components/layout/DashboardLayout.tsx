import { DashboardShell } from "@/app/components/layout/DashboardShell";
import { getSessionUser } from "@/app/lib/auth-cookies";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

interface DashboardLayoutProps {
  children: ReactNode;
  allowedRole: string;
  title: string;
  navItems: { href: string; label: string; icon: React.ReactNode; group?: string }[];
}

export async function DashboardLayout({
  children,
  allowedRole,
  title,
  navItems,
}: DashboardLayoutProps) {
  const user = await getSessionUser();

  if (!user || user.role !== allowedRole) {
    redirect("/login");
  }

  return (
    <DashboardShell
      title={title}
      navItems={navItems}
      user={{
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
      }}
    >
      {children}
    </DashboardShell>
  );
}
