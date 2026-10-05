"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import ar from "./messages/ar.json";
import en from "./messages/en.json";

export const COOKIE_NAME = "edu_lang";

export type Locale = "ar" | "en";

const messagesByLocale: Record<Locale, Record<string, string>> = {
  ar,
  en,
};

const rtlLocales: Locale[] = ["ar"];

interface I18nContextValue {
  locale: Locale;
  dir: "rtl" | "ltr";
  t: (key: string, fallback?: string) => string;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function setCookie(name: string, value: string, days = 365) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${value};expires=${expires};path=/;SameSite=Lax`;
}

function getInitialLocale(initial?: Locale): Locale {
  if (initial === "ar" || initial === "en") return initial;
  if (typeof window === "undefined") return "ar";
  const stored = localStorage.getItem(COOKIE_NAME) as Locale | null;
  if (stored === "ar" || stored === "en") return stored;
  return "ar";
}

export function I18nProvider({
  initialLocale,
  children,
}: {
  initialLocale?: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(() =>
    getInitialLocale(initialLocale)
  );

  const dir = rtlLocales.includes(locale) ? "rtl" : "ltr";

  const t = useCallback(
    (key: string, fallback?: string) => {
      return messagesByLocale[locale][key] ?? fallback ?? key;
    },
    [locale]
  );

  const setLocale = useCallback(
    (next: Locale) => {
      setLocaleState(next);
      if (typeof window !== "undefined") {
        localStorage.setItem(COOKIE_NAME, next);
      }
      setCookie(COOKIE_NAME, next);
      if (typeof document !== "undefined") {
        document.documentElement.lang = next;
        document.documentElement.dir = rtlLocales.includes(next) ? "rtl" : "ltr";
      }
    },
    []
  );

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
      document.documentElement.dir = dir;
    }
  }, [locale, dir]);

  return (
    <I18nContext.Provider value={{ locale, dir, t, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}
