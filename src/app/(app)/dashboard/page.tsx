"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Button, ButtonLink, Card, Field, Input } from "@/components/ui";
import { useAuth } from "@/lib/client/auth-context";
import { ROLE_LABELS } from "@/lib/config";
import { profileChecklist } from "@/lib/profile";

export default function DashboardPage() {
  const { me } = useAuth();
  const router = useRouter();
  const [code, setCode] = useState("");

  if (!me) return null;

  if (!me.member) {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <Card className="space-y-4">
          <h1 className="text-2xl font-semibold">Almost there</h1>
          <p className="text-muted">
            You&apos;re signed in, but CreatorsAI is invite-only. Paste the invite link from your email to activate your account.
          </p>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const m = /invite=([A-Za-z0-9_-]+)/.exec(code);
              router.push(`/signup?invite=${encodeURIComponent(m ? m[1]! : code.trim())}`);
            }}
          >
            <Field label="Invite link or code" htmlFor="code">
              <Input id="code" value={code} onChange={(e) => setCode(e.target.value)} required />
            </Field>
            <Button type="submit">Continue</Button>
          </form>
          <p className="text-sm text-muted">
            No invite yet? <Link href="/join" className="font-medium text-brand hover:underline">Request one</Link>.
          </p>
          {me.isAdmin && <ButtonLink href="/admin" variant="secondary">Open admin</ButtonLink>}
        </Card>
      </div>
    );
  }

  const m = me.member;
  const checklist = profileChecklist(m.role, me.profile);
  const done = checklist.filter((c) => c.done).length;
  const isPublic = Boolean(me.profile && "isPublic" in me.profile && me.profile.isPublic);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Welcome, {m.displayName.split(" ")[0]}</h1>
        <Badge tone="blue">{ROLE_LABELS[m.role]}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{m.role === "brand" ? "Get campaign-ready" : "Build your Trust Passport"}</h2>
            <span className="text-sm text-muted">{done} of {checklist.length} done</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={checklist.length}>
            <div className="h-full rounded-full bg-gradient-to-r from-brand to-teal transition-all" style={{ width: `${checklist.length ? (done / checklist.length) * 100 : 0}%` }} />
          </div>
          <ul className="mt-5 divide-y divide-line">
            {checklist.map((c) => (
              <li key={c.key} className="flex items-center justify-between gap-3 py-3">
                <span className="flex items-center gap-3">
                  <span className={c.done ? "grid size-5 place-items-center rounded-full bg-teal text-white" : "size-5 rounded-full ring-2 ring-line"} aria-hidden>
                    {c.done && <svg viewBox="0 0 20 20" className="size-3.5"><path fill="currentColor" d="M8.1 13.6 4.5 10l-1.4 1.4 5 5 9-9-1.4-1.4z" /></svg>}
                  </span>
                  <span className={c.done ? "text-muted line-through" : ""}>{c.label}</span>
                </span>
                {!c.done && <Link href={c.href} className="text-sm font-medium text-brand hover:underline">Do it</Link>}
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="font-semibold">Your public page</h2>
            {isPublic ? (
              <>
                <p className="mt-2 text-sm text-muted">Your Trust Passport is live and shareable.</p>
                <ButtonLink href={`/p/${m.handle}`} variant="secondary" className="mt-4">View /p/{m.handle}</ButtonLink>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted">Private. Switch on &ldquo;Make my profile public&rdquo; in your profile when you&apos;re ready.</p>
            )}
          </Card>
          <Card className="ring-teal/40">
            <h2 className="font-semibold">Deal Desk</h2>
            <p className="mt-2 text-sm text-muted">
              Log a collaboration you&apos;re already doing — even with a client who&apos;s not on CreatorsAI. Track what&apos;s due,{" "}
              {m.role === "brand" ? "nudge creators" : "send payment reminders, create invoices"} and measure results.
            </p>
            <ButtonLink href="/dashboard/deals" className="mt-4">Open Deal Desk</ButtonLink>
          </Card>
          <Card>
            <h2 className="font-semibold">{m.role === "brand" ? "Campaigns" : "Opportunities"}</h2>
            <p className="mt-2 text-sm text-muted">
              {m.role === "brand"
                ? "Write a brief once, share one link, and get applications from verified creators in one list. Publishing needs a verified business."
                : "Live briefs from verified businesses. Applying is free and needs one verified social account."}
            </p>
            <Link href="/dashboard/campaigns" className="mt-3 inline-block text-sm font-medium text-brand hover:underline">
              {m.role === "brand" ? "Create a brief →" : "Browse opportunities →"}
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
