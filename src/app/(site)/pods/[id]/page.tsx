import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Badge, ButtonLink, Card } from "@/components/ui";
import { adminDb, isAdminConfigured } from "@/lib/firebase/admin";
import { site } from "@/lib/config";
import { C } from "@/lib/server/collections";
import type { PodDoc } from "@/lib/server/pods";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };

const load = cache(async (id: string) => {
  if (!/^[A-Za-z0-9]{1,128}$/.test(id) || !isAdminConfigured()) return null;
  const db = adminDb();
  const snap = await db.collection(C.pods).doc(id).get();
  const pod = snap.data() as PodDoc | undefined;
  if (!pod || !pod.isPublic || pod.status !== "active" || pod.activeUids.length < 2) return null;
  const active = pod.members.filter((m) => m.status === "active");
  const [profiles, users] = await Promise.all([
    db.getAll(...active.map((m) => db.collection(C.creatorProfiles).doc(m.uid))),
    db.getAll(...active.map((m) => db.collection(C.users).doc(m.uid))),
  ]);
  return {
    pod,
    members: active.map((m, i) => ({
      displayName: m.displayName,
      role: m.role,
      handle: users[i]?.get("handle") as string,
      isPublic: profiles[i]?.get("isPublic") === true,
      verified: ((profiles[i]?.get("verifiedPlatforms") as string[] | undefined) ?? []).length > 0,
    })),
  };
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const r = await load(id);
  if (!r) return { title: "Pod not found", robots: { index: false } };
  return {
    title: `${r.pod.name} — Creator Pod in ${r.pod.city}`,
    description: `${r.pod.name}: a verified team of ${r.members.length} creators and professionals in ${r.pod.city} on ${site.name}.`,
    alternates: { canonical: `/pods/${id}` },
  };
}

export default async function PublicPodPage({ params }: Props) {
  const { id } = await params;
  const r = await load(id);
  if (!r) notFound();
  return (
    <section className="container-page max-w-3xl py-12 sm:py-16">
      <Card className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="blue">Creator Pod</Badge>
          <span className="text-sm text-muted">{r.pod.city}</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">{r.pod.name}</h1>
        {r.pod.description && <p className="whitespace-pre-line">{r.pod.description}</p>}
        <div className="flex flex-wrap gap-2">{r.pod.categories.map((c) => <Badge key={c}>{c}</Badge>)}</div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {r.members.map((m) => (
            <li key={m.handle} className="rounded-xl bg-paper p-4 ring-1 ring-line">
              <p className="font-medium">
                {m.isPublic ? <Link href={`/p/${m.handle}`} className="hover:underline">{m.displayName} ↗</Link> : m.displayName}
              </p>
              <p className="text-sm text-muted">{m.role}</p>
              {m.verified && <Badge tone="green">Ownership verified</Badge>}
            </li>
          ))}
        </ul>
        <div className="border-t border-line pt-5 text-sm text-muted">
          One brief, one coordinated team. Brands on CreatorsAI can share a brief link with this pod, or book a Managed Pilot.
        </div>
        <ButtonLink href="/join?role=brand">Hire creator teams on CreatorsAI</ButtonLink>
      </Card>
    </section>
  );
}
