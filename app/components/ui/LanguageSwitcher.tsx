"use client";

import { useI18n } from "@/app/lib/i18n/client";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="relative">
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as "ar" | "en")}
        className="appearance-none rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-6 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        aria-label={t("selectLanguage")}
      >
        <option value="ar">{t("arabic")}</option>
        <option value="en">{t("english")}</option>
      </select>
    </div>
  );
}
