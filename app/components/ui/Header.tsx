"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/hooks/useAuth";
import { getInitials } from "@/app/lib/utils";
import { useI18n } from "@/app/lib/i18n/client";
import { LanguageSwitcher } from "@/app/components/ui/LanguageSwitcher";
import { NotificationsBell } from "@/app/components/ui/NotificationsBell";
import { Menu, X, LogOut, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { ThemeToggle } from "@/app/components/ui/theme-toggle";
import { ProfileSettingsDialog } from "@/app/components/ui/profile-settings-dialog";
interface HeaderProps {
  user: { name: string; email: string; role: string; avatarUrl?: string } | null;
  navItems?: { href: string; label: string }[];
  /** Section title shown next to the sidebar toggle (desktop). */
  title?: string;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
}

export function Header({
  user,
  navItems = [],
  title,
  sidebarCollapsed = false,
  onToggleSidebar,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const router = useRouter();
  const { t } = useI18n();

  const { signOut } = useAuth();

  const handleLogout = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
      <div className="flex h-16 items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-3">
          {title && (
            <span className="hidden text-lg font-bold text-slate-800 md:block dark:text-white">
              {title}
            </span>
          )}
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              aria-label={t("toggleSidebar")}
              aria-expanded={!sidebarCollapsed}
              title={t("toggleSidebar")}
              className="hidden h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 md:flex dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Menu size={18} />
            </button>
          )}
          {navItems.length > 0 && (
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          )}
          <span className="text-xl font-bold text-indigo-600 md:hidden">
            EduFlow
          </span>
        </div>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <LanguageSwitcher />
          {user && <NotificationsBell />}

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="ms-1 flex items-center gap-2.5 rounded-lg p-1.5 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  {user.avatarUrl ? (
                    <Image
                      src={user.avatarUrl}
                      alt={user.name}
                      width={36}
                      height={36}
                      unoptimized
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-700 text-xs font-semibold text-white">
                      {getInitials(user.name)}
                    </span>
                  )}
                  <span className="hidden text-start sm:block" dir="auto">
                    <span className="block text-sm font-medium text-slate-900 dark:text-white">
                      {user.name}
                    </span>
                    <span className="block text-xs capitalize text-slate-500">
                      {user.role}
                    </span>
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <span className="block truncate text-sm font-semibold text-foreground">
                    {user.name}
                  </span>
                  <span
                    className="block truncate text-xs font-normal text-muted-foreground"
                    dir="ltr"
                  >
                    {user.email}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => setSettingsOpen(true)}>
                  <Settings />
                  {t("settings")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-red-600 focus:bg-red-50 focus:text-red-700 dark:text-red-400 dark:focus:bg-red-950/40"
                  onSelect={() => void handleLogout()}
                >
                  <LogOut />
                  {t("logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <ProfileSettingsDialog
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
          />
        </div>
      </div>

      {menuOpen && navItems.length > 0 && (
        <div className="border-t border-slate-200 bg-white p-4 md:hidden dark:border-slate-700 dark:bg-slate-900">
          <ul className="space-y-2">
            {navItems.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  className="block rounded px-2 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}