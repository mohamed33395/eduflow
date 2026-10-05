import Link from "next/link";
import { getI18n } from "@/app/lib/i18n/server";

export default async function Home() {
  const { t } = await getI18n();

  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-6 text-center dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-2xl rounded-2xl bg-white p-10 shadow-xl dark:bg-slate-900">
        <h1 className="mb-4 text-4xl font-bold text-slate-900 dark:text-white">
          {t("appName")}
        </h1>
        <p className="mb-8 text-lg text-slate-600 dark:text-slate-300">
          {t("homeHeroTitle")}
        </p>
        <p className="mb-8 text-slate-500 dark:text-slate-400">
          {t("homeHeroSubtitle")}
        </p>
        <Link
          href="/login"
          className="inline-block rounded-lg bg-indigo-600 px-8 py-3 font-semibold text-white hover:bg-indigo-700"
        >
          {t("getStarted")}
        </Link>
      </div>
    </main>
  );
}
