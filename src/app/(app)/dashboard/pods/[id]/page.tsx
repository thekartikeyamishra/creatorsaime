"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CreatorTrustLine } from "@/components/insights-ui";
import { Badge, Button, Card, Field, Input, Notice, Spinner, cx } from "@/components/ui";
import { api, ApiClientError } from "@/lib/client/api";
import { useAuth } from "@/lib/client/auth-context";
import { SOCIAL_PLATFORM_LABELS, site, type SocialPlatform } from "@/lib/config";
import type { CreatorReliability } from "@/lib/insights";
import { POD_LIMITS, POD_ROLE_SUGGESTIONS, sharesValid, type PodMember } from "@/lib/pods";

type Pod = { id: string; name: string; city: string; description: string; categories: string[]; leadUid: string; members: PodMember[]; isPublic: boolean; status: string };
type R = { item: Pod; verified: Record<string, string[]>; reliability: Record<string, CreatorReliability>; isLead: boolean };

export default function PodDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { me } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<R | null>(null);
  const [edit, setEdit] = useState<Record<string, { role: string; sharePct: number }>>({});
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api<R>(`/api/pods/${id}`);
      setData(r);
      setEdit(Object.fromEntries(r.item.members.map((m) => [m.uid, { role: m.role, sharePct: m.sharePct }])));
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof ApiClientError ? e.message : "Could not load pod" });
    }
  }, [id]);
  useEffect(() => {
    void load();
  }, [load]);

  async function act(body: Record<string, unknown>, key: string, success?: string) {
    setBusy(key);
    setMsg(null);
    try {
      await api(`/api/pods/${id}`, { method: "PATCH", body });
      if (success) setMsg({ tone: "success", text: success });
      await load();
      return true;
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof ApiClientError ? Object.values(e.fields)[0] ?? e.message : "Failed" });
      return false;
    } finally {
      setBusy(null);
    }
  }

  if (!data) return msg ? <Notice tone="error">{msg.text}</Notice> : <Spinner />;
  const pod = data.item;
  const active = pod.members.filter((m) => m.status === "active");
  const draftActive = active.map((m) => ({ sharePct: edit[m.uid]?.sharePct ?? m.sharePct }));
  const total = draftActive.reduce((s, m) => s + m.sharePct, 0);
  const valid = sharesValid(draftActive);
  const allVerified = active.every((m) => (data.verified[m.uid] ?? []).length > 0);
  const ready = active.length >= POD_LIMITS.minActiveToApply && valid && allVerified;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/dashboard/pods" className="text-sm text-muted hover:text-ink">← Pods</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{pod.name}</h1>
          <p className="text-muted">{pod.city} · {pod.categories.join(", ")}</p>
        </div>
        <Badge tone={ready ? "green" : "amber"}>{ready ? "Ready to apply" : "Not ready yet"}</Badge>
      </div>
      {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
      {!ready && (
        <Notice tone="info">
          To apply as a pod: at least {POD_LIMITS.minActiveToApply} active members{active.length < 2 ? " (invite someone)" : " ✓"}, shares adding to 100% {valid ? "✓" : `(now ${total}%)`}, and every member
          verified {allVerified ? "✓" : "(someone still needs to verify a social account)"}.
        </Notice>
      )}

      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Members, roles &amp; shares</h2>
          <span className={cx("text-sm font-medium", valid ? "text-emerald-700" : "text-amber-700")}>Active shares: {total}%</span>
        </div>
        <ul className="divide-y divide-line">
          {pod.members.map((m) => (
            <li key={m.uid} className="grid gap-3 py-3 sm:grid-cols-[1.4fr_1fr_6rem_auto] sm:items-center">
              <div>
                <p className="font-medium">
                  {m.displayName} {m.uid === pod.leadUid && <Badge tone="teal">Lead</Badge>} {m.status === "invited" && <Badge tone="amber">Invited</Badge>}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {(data.verified[m.uid] ?? []).map((p) => <Badge key={p} tone="green">{SOCIAL_PLATFORM_LABELS[p as SocialPlatform] ?? p} ✓</Badge>)}
                  {m.status === "active" && <CreatorTrustLine r={data.reliability[m.uid]} />}
                </div>
              </div>
              {data.isLead ? (
                <>
                  <Input aria-label="Role" list="pod-roles" value={edit[m.uid]?.role ?? m.role} onChange={(e) => setEdit({ ...edit, [m.uid]: { ...edit[m.uid]!, role: e.target.value } })} />
                  <Input aria-label="Share %" type="number" min={1} max={100} value={edit[m.uid]?.sharePct ?? m.sharePct} onChange={(e) => setEdit({ ...edit, [m.uid]: { ...edit[m.uid]!, sharePct: Math.max(1, Math.min(100, Math.floor(Number(e.target.value) || 1))) } })} />
                  {m.uid !== pod.leadUid ? (
                    <Button variant="ghost" onClick={() => window.confirm(`Remove ${m.displayName}?`) && act({ action: "remove", uid: m.uid }, `rm-${m.uid}`)} disabled={busy !== null}>Remove</Button>
                  ) : <span />}
                </>
              ) : (
                <>
                  <span className="text-sm">{m.role}</span>
                  <span className="text-sm font-medium">{m.sharePct}%</span>
                  <span />
                </>
              )}
            </li>
          ))}
        </ul>
        <datalist id="pod-roles">{POD_ROLE_SUGGESTIONS.map((r) => <option key={r} value={r} />)}</datalist>
        {data.isLead && (
          <Button
            onClick={() => act({ action: "set_members", members: pod.members.map((m) => ({ uid: m.uid, role: edit[m.uid]?.role ?? m.role, sharePct: edit[m.uid]?.sharePct ?? m.sharePct })) }, "save", "Saved roles and shares.")}
            loading={busy === "save"}
          >
            Save roles &amp; shares
          </Button>
        )}
      </Card>

      {data.isLead && pod.members.length < POD_LIMITS.maxMembers && <InviteForm onInvite={(b) => act({ action: "invite", ...b }, "invite", "Invite sent.")} busy={busy === "invite"} />}

      <Card className="space-y-3">
        <h2 className="font-semibold">Use your pod</h2>
        <p className="text-sm text-muted">
          Open any brief in <Link href="/dashboard/campaigns" className="text-brand underline">Opportunities</Link> and choose &ldquo;Apply as {pod.name}&rdquo;. When a brand hires the pod, the lead
          assigns deliverables, and every payout to members is recorded and confirmed — no awkward money conversations.
        </p>
        {pod.isPublic && (
          <p className="text-sm">
            Public page: <Link href={`/pods/${pod.id}`} className="font-mono text-brand underline">{site.url.replace(/^https?:\/\//, "")}/pods/{pod.id}</Link>
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {!data.isLead && <Button variant="ghost" onClick={async () => window.confirm("Leave this pod?") && (await act({ action: "leave" }, "leave")) && router.push("/dashboard/pods")}>Leave pod</Button>}
          {data.isLead && <Button variant="ghost" onClick={async () => window.confirm("Archive this pod? Existing deals are unaffected.") && (await act({ action: "archive" }, "archive")) && router.push("/dashboard/pods")}>Archive pod</Button>}
        </div>
      </Card>
      <p className="text-xs text-muted">Signed in as {me?.member?.displayName}.</p>
    </div>
  );
}

function InviteForm({ onInvite, busy }: { onInvite: (b: { handle: string; role: string; sharePct: number }) => Promise<boolean>; busy: boolean }) {
  const [handle, setHandle] = useState("");
  const [role, setRole] = useState<string>("Photographer");
  const [share, setShare] = useState(20);
  return (
    <Card>
      <h2 className="font-semibold">Invite a member</h2>
      <form
        className="mt-4 grid gap-3 sm:grid-cols-[1.2fr_1fr_6rem_auto] sm:items-end"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await onInvite({ handle: handle.trim().replace(/^@/, "").toLowerCase(), role, sharePct: share })) setHandle("");
        }}
      >
        <Field label="Their CreatorsAI handle" htmlFor="h"><Input id="h" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="riya-eats" /></Field>
        <Field label="Role" htmlFor="r"><Input id="r" list="pod-roles" value={role} onChange={(e) => setRole(e.target.value)} /></Field>
        <Field label="Share %" htmlFor="s"><Input id="s" type="number" min={1} max={100} value={share} onChange={(e) => setShare(Math.max(1, Math.min(100, Math.floor(Number(e.target.value) || 1))))} /></Field>
        <Button type="submit" loading={busy}>Invite</Button>
      </form>
      <p className="mt-2 text-xs text-muted">Shares apply once they join. Adjust everyone&apos;s share so active members add up to 100%.</p>
    </Card>
  );
}
