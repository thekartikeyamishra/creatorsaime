"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiClientError } from "@/lib/client/api";
import { translate, type Locale, type MessageKey } from "@/lib/i18n";
import { Button, Field, Input, Notice } from "./ui";

export function DealLinkActions({ token, defaultName, accepted, completed, otherConfirmedDone, waOptedIn, otherName, locale = "en" }: { token: string; defaultName: string; accepted: string | null; completed: string | null; otherConfirmedDone: boolean; waOptedIn: boolean; otherName: string; locale?: Locale }) {
  const t = (k: MessageKey, v?: Record<string, string | number>) => translate(locale, k, v);
  const [phone, setPhone] = useState("");
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function act(action: "accept_terms" | "confirm_complete" | "whatsapp_optin" | "whatsapp_optout") {
    setBusy(action);
    setError(null);
    try {
      const body = action === "whatsapp_optout" ? { action } : action === "whatsapp_optin" ? { action, name, phone, lang: locale } : { action, name };
      await api(`/api/d/${token}`, { body, auth: false });
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiClientError ? Object.values(e.fields)[0] ?? e.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4 border-t border-line pt-5">
      {accepted ? (
        <Notice tone="success">{t("link.agreedBy", { who: accepted })}</Notice>
      ) : (
        <p className="text-sm">{t("link.review")}</p>
      )}
      {completed && <Notice tone="success">{t("link.completedBy", { who: completed })}</Notice>}
      {(!accepted || (!completed && otherConfirmedDone)) && (
        <Field label={t("link.yourName")} htmlFor="agree-name">
          <Input id="agree-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
        </Field>
      )}
      {error && <Notice tone="error">{error}</Notice>}
      <div className="flex flex-wrap gap-2">
        {!accepted && <Button onClick={() => act("accept_terms")} loading={busy === "accept_terms"}>{t("link.iAgree")}</Button>}
        {accepted && !completed && otherConfirmedDone && (
          <Button onClick={() => act("confirm_complete")} loading={busy === "confirm_complete"}>{t("link.confirmDone")}</Button>
        )}
      </div>
      <div className="rounded-xl bg-paper p-4 ring-1 ring-line">
        {waOptedIn ? (
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span>{t("link.waOn")}</span>
            <button className="text-muted underline" onClick={() => act("whatsapp_optout")} disabled={busy !== null}>{t("link.waStop")}</button>
          </div>
        ) : (
          <form
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              void act("whatsapp_optin");
            }}
          >
            <Field label={t("link.waAsk", { name: otherName })} htmlFor="wa">
              <Input id="wa" type="tel" inputMode="tel" placeholder={t("link.waPh")} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <Button type="submit" variant="secondary" loading={busy === "whatsapp_optin"}>{t("link.waYes")}</Button>
          </form>
        )}
        <p className="mt-2 text-xs text-muted">{t("link.waSmall")}</p>
      </div>
    </div>
  );
}
