"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/app/lib/utils";
import { useI18n } from "@/app/lib/i18n/client";
import { GraduationCap } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  /** Optional section label rendered above this item. */
  group?: string;
}
interface SidebarProps {
  title: string;
  navItems: NavItem[];
  /** Hidden on desktop when true (toggled from the header ≡ button). */
  collapsed?: boolean;
}
export function Sidebar({ title, navItems, collapsed = false }: SidebarProps) {
  const pathname = usePathname();
  const { t } = useI18n();
  const firstGroupIdx = navItems.findIndex((n) => n.group !== undefined);
  // Only the longest matching href is active — e.g. on /admin/settings the
  // "/admin" dashboard link must NOT light up.
  const activeHref = navItems.reduce<string | null>((best, n) => {
    const matches = pathname === n.href || pathname.startsWith(`${n.href}/`);
    return matches && n.href.length > (best?.length ?? -1) ? n.href : best;
  }, null);

  if (collapsed) {
    return null;
  }

  return (
    <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 flex-col bg-[#0b1d19] text-emerald-50 dark:bg-slate-900 dark:text-slate-50 md:flex">
      {/* Brand block */}
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-6 dark:border-slate-800">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300 dark:bg-primary/15 dark:text-primary">
          <GraduationCap size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base font-bold text-white">{title}</h2>
          <p className="text-xs text-emerald-100/50 dark:text-slate-400">
            {t("dashboard")}
          </p>
        </div>
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {navItems.map((item, i) => {
            const active = item.href === activeHref;
            const prevGroup = i > 0 ? navItems[i - 1].group : undefined;
            const groupHeader =
              item.group !== prevGroup ? item.group : undefined;
            return (
              <React.Fragment key={item.href}>
                {groupHeader !== undefined && (
                  <li className="flex items-center gap-1.5 px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-emerald-100/40 dark:text-slate-500">
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        i === firstGroupIdx
                          ? "bg-emerald-400 dark:bg-primary"
                          : "bg-amber-400/80 dark:bg-amber-400/60"
                      )}
                    />
                    {groupHeader}
                  </li>
                )}
                <li>
                  <Link
                    href={item.href}
                    className={cn(
                      "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-white/10 text-white dark:bg-slate-800"
                        : "text-emerald-100/60 hover:bg-white/5 hover:text-emerald-50 dark:text-slate-400 dark:hover:text-slate-100"
                    )}
                  >
                    {active && (
                      <span className="absolute inset-y-2 start-0 w-1 rounded-full bg-emerald-400 dark:bg-primary" />
                    )}
                    <span
                      className={cn(
                        "shrink-0",
                        active
                          ? "text-emerald-300 dark:text-primary"
                          : "text-amber-300/70 dark:text-slate-500"
                      )}
                    >
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                </li>
              </React.Fragment>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}