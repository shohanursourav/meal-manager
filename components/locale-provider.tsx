"use client";

import { createContext, useCallback, useContext, useEffect, useMemo } from "react";

import { useLocalStorageValue, writeLocalStorage } from "@/lib/hooks";
import { translate, type TranslationKey } from "@/lib/i18n";
import type { Locale } from "@/lib/types";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  /** Translation helper: t("dash.tab.meals") */
  t: (key: TranslationKey | string) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);
const STORAGE_KEY = "mm.locale";
const DEFAULT_LOCALE: Locale = "bn";

/**
 * Bengali is the default for everyone; a stored preference (read through
 * useSyncExternalStore, so there is no hydration mismatch and no state-setting
 * effect) wins afterwards.
 */
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const stored = useLocalStorageValue(STORAGE_KEY);
  const locale: Locale = stored === "en" || stored === "bn" ? stored : DEFAULT_LOCALE;

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.setAttribute("data-locale", locale);
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    writeLocalStorage(STORAGE_KEY, next);
  }, []);

  const toggleLocale = useCallback(() => {
    writeLocalStorage(STORAGE_KEY, locale === "bn" ? "en" : "bn");
  }, [locale]);

  const t = useCallback((key: TranslationKey | string) => translate(locale, key), [locale]);

  const value = useMemo(
    () => ({ locale, setLocale, toggleLocale, t }),
    [locale, setLocale, toggleLocale, t],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useI18n(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useI18n must be used inside <LocaleProvider>");
  return ctx;
}

/** Convenience: translation function only. */
export function useT() {
  return useI18n().t;
}
