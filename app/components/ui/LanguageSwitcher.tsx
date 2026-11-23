"use client";

import { Globe } from "lucide-react";
import { useI18n } from "@/app/lib/i18n/client";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="relative flex items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800">
      <Globe size={18} className="pointer-events-none absolute start-2" />
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as "ar" | "en")}
        className="appearance-none rounded-lg bg-transparent py-2 pe-2 ps-8 text-sm font-medium text-inherit focus:outline-none"
        aria-label={t("selectLanguage")}
      >
        <option value="ar">{t("arabic")}</option>
        <option value="en">{t("english")}</option>
      </select>
    </div>
  );
}
