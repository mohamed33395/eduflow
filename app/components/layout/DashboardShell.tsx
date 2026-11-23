"use client";

import { useState, type ReactNode } from "react";
import { Header } from "@/app/components/ui/Header";
import { Sidebar } from "@/app/components/ui/Sidebar";

export interface ShellNavItem {
  href: string;
  label: string;
  icon: ReactNode;
  group?: string;
}

interface DashboardShellProps {
  title: string;
  navItems: ShellNavItem[];
  user: { name: string; email: string; role: string; avatarUrl?: string } | null;
  children: ReactNode;
}

/**
 * Client shell owning the sidebar visibility state so the header toggle
 * (bordered ≡ button, like the reference) and the sidebar stay in sync.
 */
export function DashboardShell({
  title,
  navItems,
  user,
  children,
}: DashboardShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <Sidebar title={title} navItems={navItems} collapsed={sidebarCollapsed} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          user={user}
          title={title}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
          navItems={navItems.map((n) => ({ href: n.href, label: n.label }))}
        />
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </div>
    </div>
  );
}
