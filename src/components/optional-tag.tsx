"use client";

import { useLocale } from "./locale-provider";

export function OptionalTag() {
  const { t } = useLocale();
  return <span className="font-normal text-muted">({t("common.optional")})</span>;
}
