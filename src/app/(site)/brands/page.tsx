import { PageHeader } from "@/components/page-header";
import { ButtonLink, Card } from "@/components/ui";

export const metadata = {
  title: "For brands — find verified local creators",
  description:
    "Find verified creators and coordinated Creator Pods for your campaign. Curated shortlists, clear deliverables and transparent reporting from CreatorsAI.",
  alternates: { canonical: "/brands" },
};

export default function BrandsPage() {
  return (
    <>
      <PageHeader
        eyebrow="For brands & local businesses"
        title="Reliable creators. Coordinated campaigns. Clear outcomes."
        intro="Tell us what you want to promote. During early access we personally curate a shortlist of verified, available creators — or a full Creator Pod — for your goal."
      >
        <ButtonLink href="/join?role=brand" className="!px-6 !py-3">Find Your Next Creator</ButtonLink>
      </PageHeader>

      <section className="container-page grid gap-6 py-16 md:grid-cols-3 lg:grid-cols-3">
        {[
          ["Verified talent only", "Every creator proves ownership of their accounts. Self-reported metrics are labelled — we never rely on follower counts or screenshots alone."],
          ["Managed pilots", "No 'register and wait'. We run your first campaign with you: sourcing, coordination, deliverable tracking and reporting."],
          ["Honest expectations", "We sell transparent campaign management and measurable deliverables. Nobody can guarantee virality, and we won't pretend to."],
          ["Proven track records", "See each creator's on-time delivery and repeat-client record from deals both sides confirmed — not follower counts or screenshots."],
          ["Creator Pods", "Hire a verified team — creator, local voice, photographer — in one application. One brief, one point of contact, one payment."],
          ["Rate & Results Index", "What creators in your city actually charge, and the real cost per customer from tracked campaigns. Budget right the first time."],
        ].map(([t, d]) => (
          <Card key={t}>
            <h2 className="text-lg font-semibold">{t}</h2>
            <p className="mt-2 text-muted">{d}</p>
          </Card>
        ))}
      </section>

      <section className="container-page pb-20">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="text-xl font-semibold">Who we work with first</h2>
            <ul className="mt-4 grid grid-cols-2 gap-2 text-sm text-muted">
              {["Restaurants & cafés", "Fashion & beauty", "Local D2C brands", "Hospitality", "Gyms & fitness", "Events & entertainment", "Regional brands expanding cities", "Education & coaching"].map((x) => (
                <li key={x} className="rounded-lg bg-paper px-3 py-2">{x}</li>
              ))}
            </ul>
          </Card>
          <Card>
            <h2 className="text-xl font-semibold">Pricing during early access</h2>
            <p className="mt-3 text-muted">
              Start free: unlimited Deal Desk and one open brief. Growth adds up to 10 open briefs, featured placement and exports. Want it done for you? Book a
              Managed Pilot. Creators are never charged to apply. <a href="/pricing" className="font-medium text-brand underline">See pricing</a>
            </p>
          </Card>
        </div>
      </section>
    </>
  );
}
