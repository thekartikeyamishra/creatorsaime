import { LegalPage } from "@/components/page-header";
import { POLICY_VERSION, site } from "@/lib/config";

export const metadata = { title: "Community Guidelines", description: "How we keep CreatorsAI trustworthy and respectful.", alternates: { canonical: "/community-guidelines" } };

export default function GuidelinesPage() {
  return (
    <LegalPage title="Community Guidelines" updated={POLICY_VERSION}>
      <p>{site.name} works because people can trust each other. These guidelines apply to every creator, professional, brand and organiser.</p>
      <h2>Be real</h2>
      <ul>
        <li>One person, one account. No impersonation of people or businesses.</li>
        <li>No bought followers, engagement pods for fake metrics, or misleading screenshots.</li>
        <li>Represent your rates, audience and past work honestly.</li>
      </ul>
      <h2>Be fair</h2>
      <ul>
        <li>Brands: no unpaid &ldquo;exposure&rdquo; requests disguised as campaigns, no unlimited revisions, no usage rights beyond what was agreed.</li>
        <li>Creators: deliver what you agreed, on time, or communicate early if you can&apos;t.</li>
        <li>Feedback must be about completed work and based on evidence — never retaliatory.</li>
      </ul>
      <h2>Be lawful</h2>
      <ul>
        <li>Disclose paid partnerships, gifts and other material connections as required by ASCI influencer guidelines.</li>
        <li>No hate, harassment, threats, sexual content involving minors, illegal goods or misleading claims.</li>
        <li>Respect copyright — only post content you own or are licensed to use.</li>
      </ul>
      <h2>Be safe</h2>
      <ul>
        <li>Never ask anyone to pay to &ldquo;unlock&rdquo; a campaign. Report it.</li>
        <li>Keep payments within authorised workflows once available, and report suspicious requests.</li>
      </ul>
      <h2>Enforcement</h2>
      <p>
        Breaches may lead to content removal, badge removal, suspension or closure. Decisions are made by people, recorded, and can be appealed by emailing{" "}
        <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>.
      </p>
    </LegalPage>
  );
}
