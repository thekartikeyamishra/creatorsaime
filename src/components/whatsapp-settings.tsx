"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiClientError } from "@/lib/client/api";
import { Badge, Button, Card, Field, Input, Notice } from "./ui";

type S = { available: boolean; connected: boolean; number: string | null; alerts: boolean; digest: boolean };

/** Connect WhatsApp with a one-time code, then choose which updates to receive. */
export function WhatsAppSettings() {
  const [s, setS] = useState<S | null>(null);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"idle" | "code">("idle");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setS(await api<S>("/api/whatsapp/settings"));
    } catch {
      setS(null);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function run(key: string, fn: () => Promise<unknown>, ok?: string) {
    setBusy(key);
    setMsg(null);
    try {
      await fn();
      if (ok) setMsg({ tone: "success", text: ok });
      return true;
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof ApiClientError ? Object.values(e.fields)[0] ?? e.message : "Something went wrong" });
      return false;
    } finally {
      setBusy(null);
    }
  }

  if (!s) return null;
  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">WhatsApp updates</h2>
          <p className="text-sm text-muted">New applications, hires, agreements and payments — plus a 9 AM summary on days something needs you.</p>
        </div>
        {s.connected ? <Badge tone="green">Connected · {s.number}</Badge> : <Badge>Off</Badge>}
      </div>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      {!s.available ? (
        <p className="text-sm text-muted">Coming soon.</p>
      ) : s.connected ? (
        <div className="space-y-3">
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" className="size-4" checked={s.alerts} disabled={busy !== null} onChange={(e) => run("prefs", async () => { await api("/api/whatsapp/settings", { method: "PUT", body: { alerts: e.target.checked, digest: s.digest } }); await load(); })} />
            Instant alerts (max 10 a day)
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" className="size-4" checked={s.digest} disabled={busy !== null} onChange={(e) => run("prefs", async () => { await api("/api/whatsapp/settings", { method: "PUT", body: { alerts: s.alerts, digest: e.target.checked } }); await load(); })} />
            Daily 9 AM summary
          </label>
          <Button variant="ghost" loading={busy === "off"} onClick={() => run("off", async () => { await api("/api/whatsapp/settings", { method: "DELETE" }); await load(); }, "WhatsApp disconnected.")}>Disconnect</Button>
          <p className="text-xs text-muted">You can also reply STOP to any message.</p>
        </div>
      ) : step === "idle" ? (
        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            void run("send", () => api("/api/whatsapp/optin", { body: { phone } })).then((ok) => ok && setStep("code"));
          }}
        >
          <Field label="Your WhatsApp number" htmlFor="wa-phone"><Input id="wa-phone" type="tel" inputMode="tel" placeholder="98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
          <Button type="submit" loading={busy === "send"}>Send code</Button>
        </form>
      ) : (
        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            void run("verify", async () => { await api("/api/whatsapp/verify", { body: { code } }); await load(); }, "WhatsApp connected — you'll get updates here.").then((ok) => ok && setStep("idle"));
          }}
        >
          <Field label="6-digit code from WhatsApp" htmlFor="wa-code"><Input id="wa-code" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} /></Field>
          <Button type="submit" loading={busy === "verify"}>Verify</Button>
          <Button type="button" variant="ghost" onClick={() => setStep("idle")}>Change number</Button>
        </form>
      )}
      <p className="text-xs text-muted">By connecting, you agree to receive service messages about your account on WhatsApp. We never send marketing here.</p>
    </Card>
  );
}
