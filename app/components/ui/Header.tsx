"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getAuth, signOut } from "firebase/auth";
import { getInitials } from "@/app/lib/utils";
import { useI18n } from "@/app/lib/i18n/client";
import { LanguageSwitcher } from "@/app/components/ui/LanguageSwitcher";
import { Menu, X, LogOut, Settings } from "lucide-react";
interface HeaderProps {
  user: { name: string; email: string; role: string; avatarUrl?: string } | null;
  navItems?: { href: string; label: string }[];
}

export function Header({ user, navItems = [] }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const { t } = useI18n();

  const handleLogout = async () => {
    const auth = getAuth();
    await signOut(auth);
    await fetch("/api/auth/session", {
      method: "DELETE",
      credentials: "include",
    });
    router.replace("/login");
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-700 dark:bg-slate-900/80">
      <div className="flex h-16 items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-3">
          {navItems.length > 0 && (
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="rounded p-2 text-slate-600 hover:bg-slate-100 md:hidden"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          )}
          <span className="text-xl font-bold text-indigo-600">EduFlow</span>
        </div>

        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          {user && (
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block" dir="auto">
                <p className="text-sm font-medium text-slate-900 dark:text-white">
                  {user.name}
                </p>
                <p className="text-xs text-slate-500 capitalize">{user.role}</p>
              </div>

              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                  {getInitials(user.name)}
                </div>
              )}

              <a
                href="/settings"
                className="rounded p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
                title={t("settings")}
              >
                <Settings size={18} />
              </a>

              <button
                onClick={handleLogout}
                className="rounded p-2 text-slate-500 hover:bg-slate-100 hover:text-red-600"
                title={t("logout")}
              >
                <LogOut size={18} />
              </button>
            </div>
          )}
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