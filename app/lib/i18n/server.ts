import "server-only";
import { cookies } from "next/headers";
import ar from "./messages/ar.json";
import en from "./messages/en.json";

export type Locale = "ar" | "en";

const messagesByLocale: Record<Locale, Record<string, string>> = {
  ar,
  en,
};

export const COOKIE_NAME = "edu_lang";

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get(COOKIE_NAME)?.value;
  return value === "ar" || value === "en" ? value : "ar";
}

export async function getI18n() {
  const locale = await getLocale();
  const dir = locale === "ar" ? "rtl" : "ltr";
  const messages = messagesByLocale[locale];

  function t(key: string, fallback?: string): string {
    return messages[key] ?? fallback ?? key;
  }

  return { locale, dir, t };
}
