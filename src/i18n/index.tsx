"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import ru from "./ru";
import en from "./en";

export type Locale = "ru" | "en";
type TranslationKey = keyof typeof ru;
type Translations = Record<TranslationKey, string>;

const translations: Record<Locale, Translations> = { ru, en };

type I18nContextType = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey) => string;
};

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("onlyfun-lang") as Locale | null;
      if (saved && translations[saved]) return saved;
    }
    return "ru";
  });

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("onlyfun-lang", l);
  }, []);

  const t = useCallback((key: TranslationKey) => translations[locale][key] ?? key, [locale]);

  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
