"use client";

import { useEffect } from "react";
import type { Locale } from "@/lib/i18n";
import { useLocale } from "./locale-provider";

/** Visiting a localized landing page makes that language the default for the rest of the site. */
export function LocaleSetter({ locale }: { locale: Locale }) {
  const { locale: current, setLocale } = useLocale();
  useEffect(() => {
    if (current !== locale) setLocale(locale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
