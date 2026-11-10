import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Badge, ButtonLink, Card } from "@/components/ui";
import { adminDb, isAdminConfigured } from "@/lib/firebase/admin";
import { COMPENSATION_LABELS, site } from "@/lib/config";
import { formatInr, todayIST } from "@/lib/deals";
import { idOk, type CampaignDoc } from "@/lib/server/campaigns";
import { C } from "@/lib/server/collections";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string }> };

const load = cache(async (id: string) => {
  if (!idOk(id) || !isAdminConfigured()) return null;
  const snap = await adminDb().collection(C.campaigns).doc(id).get();
  const c = snap.data() as CampaignDoc | undefined;
  if (!c || c.status !== "open") return null;
  return c;
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const c = await load(id);
  if (!c) return { title: "Brief not available", robots: { index: false } };
  return {
    title: `${c.title} — creator brief in ${c.city}`,
    description: `${c.brandName} is looking for ${c.categories.join(", ")} creators in ${c.city}. Apply by ${c.applyBy} on ${site.name}.`,
    alternates: { canonical: `/c/${id}` },
    robots: { index: c.applyBy >= todayIST(), follow: true },
  };
}

export default async function PublicBriefPage({ params }: Props) {
  const { id } = await params;
  const c = await load(id);
  if (!c) notFound();
  const closed = c.applyBy < todayIST();
  const budget =
    c.compensationType === "barter"
      ? "Product / service exchange"
      : `${c.budgetMin === c.budgetMax ? formatInr(c.budgetMax) : `${formatInr(c.budgetMin)}–${formatInr(c.budgetMax)}`} per creator${c.compensationType === "paid_plus_product" ? " + product" : ""}`;

  return (
    <section className="container-page max-w-3xl py-12 sm:py-16">
      <Card className="space-y-5">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <span>{c.brandName}</span>
          {c.brandVerified && <Badge tone="green">Verified business</Badge>}
          <Badge tone="blue">{COMPENSATION_LABELS[c.compensationType]}</Badge>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">{c.title}</h1>
        <p className="text-muted">{c.city} · {budget} · {c.creatorsNeeded} creator{c.creatorsNeeded > 1 ? "s" : ""} · apply by {c.applyBy}</p>
        <p className="whitespace-pre-line">{c.description}</p>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Deliverables</h2>
          <ul className="mt-2 space-y-1">
            {c.deliverables.map((d, i) => <li key={i}>• {d.qty}× {d.type}{d.dueDate ? ` — by ${d.dueDate}` : ""}</li>)}
          </ul>
        </div>
        {c.usageRights && <p className="text-sm"><span className="text-muted">Usage rights:</span> {c.usageRights}</p>}
        <div className="flex flex-wrap gap-2">{c.categories.map((x) => <Badge key={x}>{x}</Badge>)}</div>
        <div className="border-t border-line pt-5">
          {closed ? (
            <p className="text-muted">Applications for this brief have closed.</p>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <ButtonLink href={`/dashboard/campaigns/${id}`}>Apply on CreatorsAI</ButtonLink>
              <p className="text-sm text-muted">
                Free for creators. Not a member yet? <a href="/join?role=creator" className="font-medium text-brand hover:underline">Request an invite</a> — verified creators are reviewed first.
              </p>
            </div>
          )}
        </div>
      </Card>
    </section>
  );
}
