import { Header } from "@/app/components/ui/Header";
import { Sidebar } from "@/app/components/ui/Sidebar";
import { getSessionUser } from "@/app/lib/auth-cookies";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

interface DashboardLayoutProps {
  children: ReactNode;
  allowedRole: string;
  title: string;
  navItems: { href: string; label: string; icon: React.ReactNode }[];
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header
        user={{
          name: user.name,
          email: user.email,
          role: user.role,
          avatarUrl: user.avatarUrl,
        }}
        navItems={navItems.map((n) => ({ href: n.href, label: n.label }))}
      />
      <div className="flex">
        <Sidebar title={title} navItems={navItems} />
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
