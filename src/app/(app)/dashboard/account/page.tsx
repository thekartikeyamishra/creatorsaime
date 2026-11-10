"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Badge, Button, Card, Field, Notice, Select, Textarea } from "@/components/ui";
import { WhatsAppSettings } from "@/components/whatsapp-settings";
import { api, ApiClientError, downloadAuthed } from "@/lib/client/api";
import { useAuth } from "@/lib/client/auth-context";

type DataRequest = { id: string; type: string; status: string; createdAt: string; resolutionNote: string };
const TYPES = ["deletion", "correction", "grievance"] as const;
const TYPE_LABEL: Record<(typeof TYPES)[number], string> = { deletion: "Delete my account & data", correction: "Correct my data", grievance: "Raise a grievance" };

export default function AccountPage() {
  const { me, refreshMe } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [requests, setRequests] = useState<DataRequest[]>([]);

  const loadRequests = useCallback(async () => {
    try {
      const r = await api<{ requests: DataRequest[] }>("/api/account/requests");
      setRequests(r.requests);
    } catch {
      /* non-critical */
    }
  }, []);
  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  if (!me) return null;
  const marketing = Boolean(me.member?.marketingConsent);
  const digest = me.member?.emailDigest !== false;

  async function toggleDigest() {
    setBusy("digest");
    setMsg(null);
    try {
      await api("/api/account/preferences", { method: "PUT", body: { emailDigest: !digest } });
      await refreshMe();
      setMsg({ tone: "success", text: !digest ? "Daily reminders by email are on." : "Daily reminder emails turned off. You'll still see them in the app." });
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof ApiClientError ? e.message : "Could not update" });
    } finally {
      setBusy(null);
    }
  }

  async function toggleMarketing() {
    setBusy("consent");
    setMsg(null);
    try {
      await api("/api/account/consent", { method: "PUT", body: { marketing: !marketing } });
      await refreshMe();
      setMsg({ tone: "success", text: !marketing ? "You'll receive occasional updates." : "Marketing updates turned off." });
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof ApiClientError ? e.message : "Could not update" });
    } finally {
      setBusy(null);
    }
  }

  async function exportData() {
    setBusy("export");
    setMsg(null);
    try {
      await downloadAuthed("/api/account/export", "creatorsai-my-data.json");
    } catch {
      setMsg({ tone: "error", text: "Export failed. Try again." });
    } finally {
      setBusy(null);
    }
  }

  async function submitRequest(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const label = String(fd.get("type"));
    const type = TYPES.find((t) => TYPE_LABEL[t] === label) ?? "grievance";
    if (type === "deletion" && !window.confirm("Request deletion of your account and personal data? A person will review and confirm by email.")) return;
    setBusy("request");
    setMsg(null);
    try {
      await api("/api/account/requests", { body: { type, details: String(fd.get("details") ?? "") } });
      form.reset();
      setMsg({ tone: "success", text: "Request received. We'll acknowledge it within 24 hours." });
      await loadRequests();
    } catch (err) {
      setMsg({ tone: "error", text: err instanceof ApiClientError ? err.message : "Could not submit" });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Account &amp; privacy</h1>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      {me.member && <WhatsAppSettings />}

      {me.member && (
        <Card className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold">Daily deal reminders</h2>
            <p className="text-sm text-muted">One short email on days something is overdue or due soon. Only about your own deals.</p>
          </div>
          <Button variant="secondary" onClick={toggleDigest} loading={busy === "digest"}>{digest ? "Turn off" : "Turn on"}</Button>
        </Card>
      )}

      {me.member && (
        <Card className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold">Marketing updates</h2>
            <p className="text-sm text-muted">Occasional news about opportunities and events. Essential account emails are separate.</p>
          </div>
          <Button variant="secondary" onClick={toggleMarketing} loading={busy === "consent"}>{marketing ? "Turn off" : "Turn on"}</Button>
        </Card>
      )}

      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold">Download your data</h2>
          <p className="text-sm text-muted">A machine-readable copy of everything we hold about your account.</p>
        </div>
        <Button variant="secondary" onClick={exportData} loading={busy === "export"}>Download JSON</Button>
      </Card>

      <Card>
        <h2 className="font-semibold">Privacy &amp; data requests</h2>
        <form onSubmit={submitRequest} className="mt-4 space-y-4">
          <Field label="Request type" htmlFor="type">
            <Select id="type" name="type" options={TYPES.map((t) => TYPE_LABEL[t])} />
          </Field>
          <Field label="Details" htmlFor="details" optional>
            <Textarea id="details" name="details" maxLength={1000} />
          </Field>
          <Button type="submit" loading={busy === "request"}>Submit request</Button>
        </form>
        {requests.length > 0 && (
          <ul className="mt-6 divide-y divide-line text-sm">
            {requests.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <span className="capitalize">{r.type} · {new Date(r.createdAt).toLocaleDateString("en-IN")}</span>
                <Badge tone={r.status === "open" ? "amber" : "green"}>{r.status}</Badge>
                {r.resolutionNote && <p className="w-full text-muted">{r.resolutionNote}</p>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
