"use client";

import { Moon, Sun } from "lucide-react";
import { useI18n } from "@/app/lib/i18n/client";

/** Toggles the `.dark` class on <html>; persists to localStorage. */
export function ThemeToggle() {
  const { t } = useI18n();

  const toggle = () => {
    const el = document.documentElement;
    const next = !el.classList.contains("dark");
    el.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // storage unavailable — session-only
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t("toggleTheme")}
      title={t("toggleTheme")}
      className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
    >
      {/* both icons render; the .dark class picks which is visible — no
          hydration mismatch, no state needed */}
      <Moon size={18} className="dark:hidden" />
      <Sun size={18} className="hidden dark:block" />
    </button>
  );
}
