"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";

import { useLocalStorageValue, writeLocalStorage } from "@/lib/hooks";

export type ThemeMode = "light" | "dark";

interface ThemeContextValue {
  theme: ThemeMode;
  /** True when no explicit choice has been stored (OS preference is in charge). */
  followsSystem: boolean;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "mm.theme";

/** Inline script that applies the stored theme before first paint (no flash). */
export const themeInitScript = `(function(){try{var k=localStorage.getItem("${STORAGE_KEY}");var m=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";var t=k==="dark"||k==="light"?k:m;var r=document.documentElement;r.classList.toggle("dark",t==="dark");r.style.colorScheme=t;}catch(e){}})();`;

function subscribeToSystemTheme(listener: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", listener);
  return () => media.removeEventListener("change", listener);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Both the stored choice and the OS preference are external stores, read with
  // useSyncExternalStore: hydration-safe and reactive without extra effects.
  const stored = useLocalStorageValue(STORAGE_KEY);
  const systemDark = useSyncExternalStore(
    subscribeToSystemTheme,
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
    () => false,
  );

  const followsSystem = stored !== "dark" && stored !== "light";
  const theme: ThemeMode = followsSystem ? (systemDark ? "dark" : "light") : (stored as ThemeMode);

  // The inline bootstrap script has already set the class for the first paint;
  // this keeps it in sync with React state afterwards.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
  }, [theme]);

  const setTheme = useCallback((mode: ThemeMode) => {
    writeLocalStorage(STORAGE_KEY, mode);
  }, []);

  const toggleTheme = useCallback(() => {
    writeLocalStorage(STORAGE_KEY, theme === "dark" ? "light" : "dark");
  }, [theme]);

  const value = useMemo(
    () => ({ theme, followsSystem, toggleTheme, setTheme }),
    [followsSystem, setTheme, theme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
}
