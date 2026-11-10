"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { isLocale, LOCALE_COOKIE, translate, type Locale, type MessageKey } from "@/lib/i18n";

type Ctx = { locale: Locale; setLocale: (l: Locale) => void; t: (key: MessageKey, vars?: Record<string, string | number>) => string };
const LocaleCtx = createContext<Ctx | null>(null);

function readCookie(): Locale | null {
  const m = /(?:^|;\s*)cai_lang=(en|hi)/.exec(typeof document === "undefined" ? "" : document.cookie);
  return m && isLocale(m[1]) ? m[1] : null;
}

/** Client-side locale. Starts in English (matches server HTML), then applies the saved choice. */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  useEffect(() => {
    const saved = readCookie();
    if (saved) setLocaleState(saved);
    else if (navigator.language?.toLowerCase().startsWith("hi")) setLocaleState("hi");
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale === "hi" ? "hi-IN" : "en-IN";
  }, [locale]);
  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    window.dispatchEvent(new CustomEvent("cai:locale", { detail: l }));
  }, []);
  const t = useCallback((key: MessageKey, vars?: Record<string, string | number>) => translate(locale, key, vars), [locale]);
  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <LocaleCtx.Provider value={value}>{children}</LocaleCtx.Provider>;
}

export function useLocale(): Ctx {
  const v = useContext(LocaleCtx);
  // Safe fallback so components also work outside the provider (e.g. tests).
  return v ?? { locale: "en", setLocale: () => undefined, t: (k, vars) => translate("en", k, vars) };
}

export function LanguageSwitcher({ dark, onChange }: { dark?: boolean; onChange?: (l: Locale) => void }) {
  const { locale, setLocale } = useLocale();
  const base = "rounded-lg px-2 py-1 text-xs font-semibold transition";
  const on = dark ? "bg-white text-ink" : "bg-ink text-white";
  const off = dark ? "text-slate-300 hover:text-white" : "text-muted hover:text-ink";
  return (
    <div role="group" aria-label="Language / भाषा" className={dark ? "flex rounded-xl bg-white/10 p-0.5" : "flex rounded-xl bg-slate-100 p-0.5"}>
      {(["en", "hi"] as const).map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={locale === l}
          className={`${base} ${locale === l ? on : off}`}
          onClick={() => {
            setLocale(l);
            onChange?.(l);
          }}
        >
          {l === "en" ? "EN" : "हिं"}
        </button>
      ))}
    </div>
  );
}
