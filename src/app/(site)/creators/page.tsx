import { PageHeader } from "@/components/page-header";
import { ButtonLink, Card } from "@/components/ui";

export const metadata = {
  title: "For creators — paid brand collaborations, verified",
  description:
    "Join CreatorsAI free: build a verified Creator Trust Passport, team up in Creator Pods and find paid brand collaborations in your city. Never pay to apply.",
  alternates: { canonical: "/creators" },
};

const sections = [
  {
    title: "Creator Trust Passport",
    body: "A portable professional profile: verified account ownership, completed campaigns, on-time delivery record, brand feedback and your portfolio. Share it with any brand — even outside CreatorsAI. Ratings are evidence-based and appealable; we never publish an opaque universal score.",
  },
  {
    title: "Creator Pods",
    body: "Team up with other verified creators and professionals — a food creator, a local voice, a photographer — and take on campaigns that are too big for one person. Roles, deliverables, deadlines and payment shares are agreed upfront.",
  },
  {
    title: "Fair terms by default",
    body: "Standard deliverables, revision limits, content usage rights and payment milestones. No pressure into free work or unlimited revisions. Paid collaborations must follow ASCI disclosure rules, and we help you do that correctly.",
  },
  {
    title: "Know who pays — and what to charge",
    body: "See each brand's payment record from deals both sides confirmed, and check the Rate Index for what creators like you actually get paid in your city. Free, and only possible because the data comes from real completed deals.",
  },
  {
    title: "Your city, your community",
    body: "City communities, creator meetups and collaborations with people who understand your audience. We grow one city at a time so the network near you is genuinely active.",
  },
];

export default function CreatorsPage() {
  return (
    <>
      <PageHeader
        eyebrow="For creators & creative professionals"
        title="Get paid for great work — again and again."
        intro="CreatorsAI is free for creators, permanently. We earn when brands run successful campaigns, so our job is to help you land repeat collaborations."
      >
        <ButtonLink href="/join?role=creator" className="!px-6 !py-3">Join as a Creator</ButtonLink>
        <ButtonLink href="/join?role=professional" variant="light" className="!px-6 !py-3">I&apos;m a photographer / editor</ButtonLink>
      </PageHeader>
      <section className="container-page grid gap-6 py-16 md:grid-cols-2">
        {sections.map((s) => (
          <Card key={s.title}>
            <h2 className="text-xl font-semibold">{s.title}</h2>
            <p className="mt-3 text-muted">{s.body}</p>
          </Card>
        ))}
      </section>
      <section className="container-page pb-20">
        <Card className="bg-paper">
          <h2 className="text-xl font-semibold">What it costs</h2>
          <p className="mt-2 text-muted">
            Free: profile, Trust Passport, opportunity discovery, standard applications, community access and collaboration history. We will never paywall
            access to ordinary opportunities.
          </p>
        </Card>
      </section>
    </>
  );
}
