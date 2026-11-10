"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Badge, Button, Card, Field, Input, Notice, Spinner, Textarea } from "@/components/ui";
import { api, ApiClientError } from "@/lib/client/api";
import { useAuth } from "@/lib/client/auth-context";
import { SOCIAL_PLATFORM_LABELS, SOCIAL_PLATFORMS, type SocialPlatform } from "@/lib/config";

type Account = {
  id: string;
  platform: SocialPlatform;
  url: string;
  handle: string;
  status: "awaiting_code" | "pending_review" | "verified" | "rejected";
  verificationCode: string;
  reviewNote: string;
  followerCountSelfReported: number | null;
};

const statusTone = { awaiting_code: "amber", pending_review: "blue", verified: "green", rejected: "red" } as const;
const statusLabel = { awaiting_code: "Add code to bio", pending_review: "Under review", verified: "Verified", rejected: "Not verified" } as const;

export default function VerificationPage() {
  const { me } = useAuth();
  if (!me?.member) return <Notice tone="info">Accept your invite first.</Notice>;
  return me.member.role === "brand" ? <BrandVerification /> : <SocialVerification />;
}

function SocialVerification() {
  const { refreshMe } = useAuth();
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api<{ accounts: Account[] }>("/api/verification/social");
      setAccounts(r.accounts);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Could not load accounts");
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const followers = String(fd.get("followers") ?? "").replace(/[,\s]/g, "");
    setBusy("add");
    setError(null);
    setErrors({});
    try {
      await api("/api/verification/social", {
        body: {
          platform: String(fd.get("platform")),
          url: String(fd.get("url") ?? ""),
          handle: String(fd.get("handle") ?? ""),
          followerCountSelfReported: followers ? Number(followers) : undefined,
        },
      });
      form.reset();
      await load();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrors(err.fields);
        setError(err.message);
      }
    } finally {
      setBusy(null);
    }
  }

  async function act(id: string, action: "ready_for_review" | "remove") {
    if (action === "remove" && !window.confirm("Remove this account?")) return;
    setBusy(id);
    setError(null);
    try {
      await api(`/api/verification/social/${id}`, { method: "PATCH", body: { action } });
      await Promise.all([load(), refreshMe()]);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Verify your social accounts</h1>
        <p className="mt-2 text-muted">
          Prove you own your accounts: add the account, put your unique code in its bio, and we review it. You can remove the code once you&apos;re verified.
          Follower counts you enter are shown as <em>self-reported</em>.
        </p>
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      {accounts === null ? (
        <Spinner />
      ) : accounts.length === 0 ? (
        <Card><p className="text-sm text-muted">No accounts added yet.</p></Card>
      ) : (
        <ul className="space-y-4">
          {accounts.map((a) => (
            <li key={a.id}>
              <Card className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{SOCIAL_PLATFORM_LABELS[a.platform]} · @{a.handle.replace(/^@/, "")}</p>
                    <a href={a.url} target="_blank" rel="noopener noreferrer nofollow" className="text-sm text-brand hover:underline break-all">{a.url}</a>
                  </div>
                  <Badge tone={statusTone[a.status]}>{statusLabel[a.status]}</Badge>
                </div>
                {(a.status === "awaiting_code" || a.status === "rejected") && (
                  <div className="rounded-xl bg-paper p-4 ring-1 ring-line">
                    <p className="text-sm">Add this code anywhere in your bio, then tap the button:</p>
                    <p className="mt-2 font-mono text-lg font-semibold tracking-wider">{a.verificationCode}</p>
                    {a.status === "rejected" && a.reviewNote && <p className="mt-2 text-sm text-red-700">Reviewer note: {a.reviewNote}</p>}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button onClick={() => act(a.id, "ready_for_review")} loading={busy === a.id}>I&apos;ve added the code</Button>
                      <Button variant="ghost" onClick={() => act(a.id, "remove")} disabled={busy === a.id}>Remove</Button>
                    </div>
                  </div>
                )}
                {a.status === "pending_review" && <p className="text-sm text-muted">Keep the code in your bio until we&apos;ve reviewed it — usually within one business day.</p>}
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Card>
        <h2 className="font-semibold">Add an account</h2>
        <form onSubmit={add} className="mt-4 grid gap-4 sm:grid-cols-2" noValidate>
          <Field label="Platform" htmlFor="platform" error={errors.platform}>
            <select id="platform" name="platform" defaultValue="instagram" className="block w-full rounded-xl bg-white px-3.5 py-2.5 text-sm ring-1 ring-line focus:ring-2 focus:ring-brand focus:outline-none">
              {SOCIAL_PLATFORMS.map((p) => (
                <option key={p} value={p}>{SOCIAL_PLATFORM_LABELS[p]}</option>
              ))}
            </select>
          </Field>
          <Field label="Handle" htmlFor="handle" error={errors.handle}>
            <Input id="handle" name="handle" required maxLength={60} placeholder="@yourname" />
          </Field>
          <Field label="Profile URL" htmlFor="url" error={errors.url}>
            <Input id="url" name="url" type="url" required maxLength={300} placeholder="https://instagram.com/yourname" />
          </Field>
          <Field label="Followers / subscribers" htmlFor="followers" error={errors.followerCountSelfReported} optional hint="Self-reported">
            <Input id="followers" name="followers" inputMode="numeric" maxLength={13} />
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" loading={busy === "add"}>Add account</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

type BrandVerificationDoc = { status: "pending_review" | "verified" | "rejected"; reviewNote: string; legalName: string } | null;

function BrandVerification() {
  const [doc, setDoc] = useState<BrandVerificationDoc | undefined>(undefined);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api<{ verification: BrandVerificationDoc }>("/api/verification/brand");
      setDoc(r.verification);
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof ApiClientError ? e.message : "Could not load" });
      setDoc(null);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const s = (k: string) => String(fd.get(k) ?? "");
    setBusy(true);
    setErrors({});
    setMsg(null);
    try {
      await api("/api/verification/brand", {
        body: {
          legalName: s("legalName"),
          representativeName: s("representativeName"),
          representativeRole: s("representativeRole"),
          businessEmail: s("businessEmail"),
          businessPhone: s("businessPhone"),
          website: s("website"),
          gstin: s("gstin"),
          registeredAddress: s("registeredAddress"),
        },
      });
      setMsg({ tone: "success", text: "Submitted. We'll review your details and may contact you to confirm." });
      await load();
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrors(err.fields);
        setMsg({ tone: "error", text: err.message });
      }
    } finally {
      setBusy(false);
    }
  }

  if (doc === undefined) return <Spinner />;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Verify your business</h1>
        <p className="mt-2 text-muted">Verified brands get priority shortlists, and creators can trust that your briefs are real.</p>
      </div>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      {doc?.status === "verified" && <Notice tone="success">{doc.legalName} is verified.</Notice>}
      {doc?.status === "pending_review" && <Notice tone="info">Your details are under review — usually within one business day.</Notice>}
      {doc?.status === "rejected" && <Notice tone="warn">We couldn&apos;t verify your details{doc.reviewNote ? `: ${doc.reviewNote}` : "."} Update and resubmit below.</Notice>}

      {(!doc || doc.status === "rejected") && (
        <Card>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
            <Field label="Registered business name" htmlFor="legalName" error={errors.legalName}><Input id="legalName" name="legalName" required maxLength={120} /></Field>
            <Field label="GSTIN" htmlFor="gstin" error={errors.gstin} optional><Input id="gstin" name="gstin" maxLength={15} /></Field>
            <Field label="Authorised representative" htmlFor="representativeName" error={errors.representativeName}><Input id="representativeName" name="representativeName" required maxLength={80} /></Field>
            <Field label="Their role" htmlFor="representativeRole" error={errors.representativeRole}><Input id="representativeRole" name="representativeRole" required maxLength={60} placeholder="Owner, Marketing Manager…" /></Field>
            <Field label="Business email" htmlFor="businessEmail" error={errors.businessEmail}><Input id="businessEmail" name="businessEmail" type="email" required /></Field>
            <Field label="Business phone" htmlFor="businessPhone" error={errors.businessPhone}><Input id="businessPhone" name="businessPhone" type="tel" required placeholder="+91 …" /></Field>
            <div className="sm:col-span-2"><Field label="Website" htmlFor="website" error={errors.website} optional><Input id="website" name="website" type="url" maxLength={300} /></Field></div>
            <div className="sm:col-span-2"><Field label="Registered address" htmlFor="registeredAddress" error={errors.registeredAddress}><Textarea id="registeredAddress" name="registeredAddress" required maxLength={300} /></Field></div>
            <p className="text-xs text-muted sm:col-span-2">Used only to verify your business. Never shown publicly. See our Privacy Policy.</p>
            <div className="sm:col-span-2"><Button type="submit" loading={busy}>Submit for verification</Button></div>
          </form>
        </Card>
      )}
    </div>
  );
}
