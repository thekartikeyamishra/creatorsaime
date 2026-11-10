import { PageHeader } from "@/components/page-header";
import { ButtonLink } from "@/components/ui";
import { COHORT_CITIES, site } from "@/lib/config";

export const metadata = {
  title: "About CreatorsAI & the founder",
  description: `Why ${site.founder} is building CreatorsAI — the Creator Growth Network for India's creators, brands and local communities.`,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <PageHeader eyebrow="About" title="The place where creators actually earn." />
      <section className="container-page py-16">
        <div className="prose-legal">
          <p>
            India&apos;s creator economy is no longer a metro story. Most creators now come from smaller cities and towns — but paid work hasn&apos;t followed them. Most
            creators who take part in brand campaigns still complete only about one paid campaign a year, while brands struggle to find reliable local talent they
            can trust.
          </p>
          <p>
            CreatorsAI exists to close that gap. Not with another directory where creators make a profile and wait, but with a network built around trust, real
            transactions and repeat collaboration: verified Creator Trust Passports, Creator Pods for team campaigns, city communities and events — with AI doing the
            operational heavy lifting in the background.
          </p>
          <h2>How we work</h2>
          <ul>
            <li>We earn when we create measurable value — not when someone signs up.</li>
            <li>Local density before national scale. We&apos;re curating our first cohort in {COHORT_CITIES.join(" and ")}.</li>
            <li>No fake brands, fake numbers, fake reviews or fake urgency. Ever.</li>
            <li>People make the important decisions: suspensions, disputes and verification are reviewed by humans.</li>
            <li>Your professional identity belongs to you. You can take your verified portfolio anywhere.</li>
          </ul>
          <h2>The founder</h2>
          <p>
            CreatorsAI is founded and built by {site.founder}, an independent full-stack developer and founder who builds software products for Indian and
            international markets, and building CreatorsAI in public — follow along on X at{" "}
            <a href={site.xUrl} target="_blank" rel="noopener noreferrer me">@{site.xHandle}</a>. Questions, partnerships or press:{" "}
            <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>.
          </p>
        </div>
        <div className="mt-10">
          <ButtonLink href="/join">Request an invite</ButtonLink>
        </div>
      </section>
    </>
  );
}
