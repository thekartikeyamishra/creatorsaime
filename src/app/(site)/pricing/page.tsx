import { PageHeader } from "@/components/page-header";
import { BRAND_FREE_FEATURES, BRAND_GROWTH_FEATURES, Check, priceLine } from "@/components/pricing";
import { ButtonLink, Card } from "@/components/ui";
import { PRODUCTS } from "@/lib/plans";

export const metadata = {
  title: "Pricing — free for creators, simple plans for brands",
  description: "CreatorsAI is free for creators forever. Brands start free and upgrade to Growth or book a Managed Pilot campaign. Prepaid, no auto-renewal.",
  alternates: { canonical: "/pricing" },
};

export default function PricingPage() {
  const p = priceLine();
  return (
    <>
      <PageHeader eyebrow="Pricing" title="Free for creators. Fair for brands." intro="We earn when brands get value — never by charging creators to apply. Prepaid plans with no auto-renewal and no surprise debits." />
      <section className="container-page grid gap-6 py-16 lg:grid-cols-4">
        <Card>
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-600">Creators</p>
          <p className="mt-2 text-3xl font-semibold">₹0</p>
          <p className="text-sm text-muted">Forever</p>
          <ul className="mt-5 space-y-2 text-sm">
            <Check>Trust Passport &amp; verification</Check>
            <Check>Deal Desk, reminders, invoices</Check>
            <Check>Results tracking</Check>
            <Check>Apply to campaigns — always free</Check>
          </ul>
          <ButtonLink href="/join?role=creator" variant="secondary" className="mt-6 w-full">Join as a creator</ButtonLink>
        </Card>
        <Card>
          <p className="text-sm font-semibold uppercase tracking-wider text-brand">Brands · Free</p>
          <p className="mt-2 text-3xl font-semibold">₹0</p>
          <p className="text-sm text-muted">Start here</p>
          <ul className="mt-5 space-y-2 text-sm">{BRAND_FREE_FEATURES.map((f) => <Check key={f}>{f}</Check>)}</ul>
          <ButtonLink href="/join?role=brand" variant="secondary" className="mt-6 w-full">Request access</ButtonLink>
        </Card>
        <Card className="ring-2 ring-brand">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand">Brands · Growth</p>
          <p className="mt-2 text-3xl font-semibold">{p.monthly}<span className="text-base font-normal text-muted">/mo</span></p>
          <p className="text-sm text-muted">or {p.yearly}/year — 2 months free</p>
          <ul className="mt-5 space-y-2 text-sm">{BRAND_GROWTH_FEATURES.map((f) => <Check key={f}>{f}</Check>)}</ul>
          <ButtonLink href="/join?role=brand" className="mt-6 w-full">Get started</ButtonLink>
        </Card>
        <Card className="bg-ink text-white ring-ink">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal">Managed Pilot</p>
          <p className="mt-2 text-3xl font-semibold">{p.pilot}</p>
          <p className="text-sm text-slate-400">One campaign, done with you</p>
          <p className="mt-5 text-sm text-slate-300">{PRODUCTS.managed_pilot.blurb}</p>
          <ButtonLink href="/join?role=brand" variant="light" className="mt-6 w-full">Book via your dashboard</ButtonLink>
        </Card>
      </section>
      <section className="container-page pb-20 text-sm text-muted">
        Prices in Indian Rupees. Payments by Razorpay — UPI, cards, net banking, wallets. Taxes as applicable. See the <a href="/refund-policy" className="text-brand underline">refund policy</a>.
      </section>
    </>
  );
}
