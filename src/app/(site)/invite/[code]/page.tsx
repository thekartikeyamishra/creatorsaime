import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui";
import { isAdminConfigured, adminDb } from "@/lib/firebase/admin";
import { REF_CODE_RE, REFERRAL } from "@/lib/referrals";
import { C } from "@/lib/server/collections";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "You're invited", robots: { index: false, follow: false } };

async function inviter(code: string): Promise<{ name: string; role: string; handle: string | null } | null> {
  if (!REF_CODE_RE.test(code) || !isAdminConfigured()) return null;
  try {
    const db = adminDb();
    const c = await db.collection(C.memberRefCodes).doc(code).get();
    if (!c.exists) return null;
    const u = await db.collection(C.users).doc(c.get("uid") as string).get();
    if (!u.exists || u.get("status") !== "active") return null;
    // First name only — never more personal data than needed on a public page.
    return { name: String(u.get("displayName") ?? "A member").split(" ")[0]!, role: String(u.get("role")), handle: null };
  } catch {
    return null;
  }
}

/** Personal landing after /r/[code]: who invited you, what you get, one tap to join. */
export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const who = await inviter(code.toLowerCase());
  const name = who?.name ?? "A CreatorsAI member";
  return (
    <section className="grid-glow bg-ink text-white">
      <div className="container-page grid gap-12 py-16 sm:py-24 lg:grid-cols-2 lg:items-center">
        <div data-spotlight className="rounded-3xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-teal">Personal invite</p>
          <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">{name} invited you to CreatorsAI</h1>
          <p className="mt-4 max-w-xl text-lg leading-8 text-slate-300">
            India&apos;s trusted network for creators and the businesses that hire them — every deal agreed, tracked and paid on time.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <span data-magnetic className="inline-flex"><ButtonLink href="/signup?role=brand" className="!px-6 !py-3 text-base">I&apos;m a brand — start {REFERRAL.brandTrialDays} days free</ButtonLink></span>
            <span data-magnetic className="inline-flex"><ButtonLink href="/signup?role=creator" variant="light" className="!px-6 !py-3 text-base">I&apos;m a creator — join free</ButtonLink></span>
          </div>
          <p className="mt-4 text-sm text-slate-400">Already a member? <Link href="/login" className="text-white underline">Sign in</Link></p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {[
            ["For brands", `${REFERRAL.brandTrialDays} days of Growth free: featured briefs, city-level Rate Index and cost per customer.`],
            ["For creators", "Free forever: Deal Desk, WhatsApp payment reminders in Hindi or English, and a verified Trust Passport."],
            ["Verified, not claimed", "Track records and reviews come only from deals both sides confirmed."],
            ["No risk", "No card needed to join. Prepaid plans, never auto-debited."],
          ].map(([h, b]) => (
            <li key={h} data-reveal className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
              <p className="font-semibold">{h}</p>
              <p className="mt-1 text-sm leading-6 text-slate-300">{b}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
