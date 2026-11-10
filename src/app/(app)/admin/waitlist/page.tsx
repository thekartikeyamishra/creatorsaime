"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, Input, Notice, Spinner, cx } from "@/components/ui";
import { api, ApiClientError } from "@/lib/client/api";
import { ROLE_LABELS, ROLES, type Role } from "@/lib/config";

type Entry = {
  id: string;
  name: string;
  email: string;
  city: string;
  role: Role;
  category: string;
  objective: string | null;
  link: string;
  languages: string[];
  challenges: string;
  wants: string;
  referralSource: string | null;
  referralCode: string;
  referralsTotal: number;
  referralsQualified: number;
  status: "pending" | "invited" | "joined" | "rejected";
  inCohortCity: boolean;
  marketingConsent: boolean;
  createdAt: string;
};
const STATUSES = ["pending", "invited", "joined", "rejected"] as const;
const tone = { pending: "amber", invited: "blue", joined: "green", rejected: "red" } as const;

export default function AdminWaitlist() {
  const [status, setStatus] = useState<(typeof STATUSES)[number]>("pending");
  const [role, setRole] = useState<Role | "">("");
  const [items, setItems] = useState<Entry[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [invite, setInvite] = useState<{ email: string; url: string; days: number } | null>(null);

  const load = useCallback(
    async (after?: string) => {
      setError(null);
      const qs = new URLSearchParams({ status, ...(role ? { role } : {}), ...(after ? { cursor: after } : {}) });
      try {
        const r = await api<{ items: Entry[]; nextCursor: string | null }>(`/api/admin/waitlist?${qs}`);
        setItems((cur) => (after && cur ? [...cur, ...r.items] : r.items));
        setCursor(r.nextCursor);
      } catch (e) {
        setError(e instanceof ApiClientError ? e.message : "Failed to load");
      }
    },
    [status, role],
  );
  useEffect(() => {
    setItems(null);
    void load();
  }, [load]);

  async function act(id: string, action: "approve" | "reject" | "revoke_invite") {
    const note = action === "reject" ? window.prompt("Internal note (optional):") ?? "" : "";
    setBusy(id);
    setError(null);
    try {
      const r = await api<{ email: string; inviteUrl: string | null; expiresInDays: number | null }>(`/api/admin/waitlist/${id}`, { method: "PATCH", body: { action, note } });
      if (r.inviteUrl) setInvite({ email: r.email, url: r.inviteUrl, days: r.expiresInDays ?? 14 });
      setItems((cur) => cur?.filter((x) => x.id !== id) ?? null);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Waitlist</h1>

      {invite && (
        <Card className="space-y-3 ring-2 ring-brand">
          <p className="font-semibold">Invite created for {invite.email}</p>
          <p className="text-sm text-muted">This link is shown only once and expires in {invite.days} days. It only works for this email address.</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input readOnly value={invite.url} onFocus={(e) => e.currentTarget.select()} aria-label="Invite link" />
            <Button variant="secondary" onClick={() => navigator.clipboard.writeText(invite.url)}>Copy</Button>
            <a
              className="inline-flex items-center justify-center rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white"
              href={`mailto:${invite.email}?subject=${encodeURIComponent("Your CreatorsAI invite")}&body=${encodeURIComponent(
                `Hi,\n\nYou're invited to join CreatorsAI's first verified cohort.\n\nAccept your invite (sign up with this email address):\n${invite.url}\n\nThis link expires in ${invite.days} days.\n\n— Kartikeya, CreatorsAI`,
              )}`}
            >
              Email it
            </a>
          </div>
          <button className="text-sm text-muted hover:text-ink" onClick={() => setInvite(null)}>Dismiss</button>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setStatus(s)} className={cx("rounded-full px-3 py-1.5 text-sm capitalize ring-1", status === s ? "bg-ink text-white ring-ink" : "bg-white ring-line")}>
            {s}
          </button>
        ))}
        <span className="mx-2 w-px bg-line" />
        <button onClick={() => setRole("")} className={cx("rounded-full px-3 py-1.5 text-sm ring-1", role === "" ? "bg-ink text-white ring-ink" : "bg-white ring-line")}>All roles</button>
        {ROLES.map((r) => (
          <button key={r} onClick={() => setRole(r)} className={cx("rounded-full px-3 py-1.5 text-sm ring-1", role === r ? "bg-ink text-white ring-ink" : "bg-white ring-line")}>
            {ROLE_LABELS[r]}
          </button>
        ))}
      </div>

      {error && <Notice tone="error">{error}</Notice>}
      {items === null ? (
        <Spinner />
      ) : items.length === 0 ? (
        <Card><p className="text-sm text-muted">Nothing here.</p></Card>
      ) : (
        <ul className="space-y-3">
          {items.map((e) => (
            <li key={e.id}>
              <Card className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{e.name} <span className="font-normal text-muted">· {e.email}</span></p>
                    <p className="text-sm text-muted">
                      {ROLE_LABELS[e.role]} · {e.category}
                      {e.objective ? ` · ${e.objective}` : ""} · {e.city} · {new Date(e.createdAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {e.inCohortCity && <Badge tone="teal">Cohort city</Badge>}
                    {e.referralsQualified > 0 && <Badge tone="blue">{e.referralsQualified} qualified referrals</Badge>}
                    <Badge tone={tone[e.status]}>{e.status}</Badge>
                  </div>
                </div>
                {e.link && <a href={e.link} target="_blank" rel="noopener noreferrer nofollow" className="block break-all text-sm text-brand hover:underline">{e.link}</a>}
                {e.languages.length > 0 && <p className="text-sm text-muted">Languages: {e.languages.join(", ")}</p>}
                {e.challenges && <p className="text-sm"><span className="text-muted">Challenge:</span> {e.challenges}</p>}
                {e.wants && <p className="text-sm"><span className="text-muted">Wants:</span> {e.wants}</p>}
                <p className="text-xs text-muted">
                  Source: {e.referralSource ?? "—"} · Referrals: {e.referralsTotal} total · Marketing consent: {e.marketingConsent ? "yes" : "no"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(e.status === "pending" || e.status === "rejected") && <Button onClick={() => act(e.id, "approve")} loading={busy === e.id}>Approve &amp; create invite</Button>}
                  {e.status === "invited" && (
                    <>
                      <Button variant="secondary" onClick={() => act(e.id, "approve")} loading={busy === e.id}>Re-issue invite</Button>
                      <Button variant="ghost" onClick={() => act(e.id, "revoke_invite")} disabled={busy === e.id}>Revoke invite</Button>
                    </>
                  )}
                  {e.status === "pending" && <Button variant="ghost" onClick={() => act(e.id, "reject")} disabled={busy === e.id}>Decline</Button>}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      {cursor && <Button variant="secondary" onClick={() => load(cursor)}>Load more</Button>}
    </div>
  );
}
