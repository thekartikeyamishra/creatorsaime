import { LegalPage } from "@/components/page-header";
import { POLICY_VERSION, site } from "@/lib/config";

export const metadata = { title: "Grievance Redressal", description: "How to raise a complaint or privacy request with CreatorsAI.", alternates: { canonical: "/grievance" } };

export default function GrievancePage() {
  return (
    <LegalPage title="Grievance Redressal" updated={POLICY_VERSION}>
      <p>
        In line with the Information Technology Act, 2000 and rules made under it, and the Digital Personal Data Protection Act, 2023, you can raise complaints about content,
        your account or your personal data with our Grievance Officer.
      </p>
      <h2>Grievance Officer</h2>
      <p>
        {site.founder}
        <br />
        Email: <a href={`mailto:${site.grievanceEmail}`}>{site.grievanceEmail}</a>
      </p>
      <h2>How to raise a grievance</h2>
      <ul>
        <li>Signed-in members: Account settings → &ldquo;Privacy &amp; data requests&rdquo;.</li>
        <li>Anyone: email the Grievance Officer with your name, the email linked to your account (if any), and a description of the issue.</li>
      </ul>
      <h2>What happens next</h2>
      <p>
        We acknowledge complaints within 24 hours and aim to resolve them within 15 days, or sooner where the law requires. Privacy requests (access, correction, deletion,
        withdrawal of consent) are handled within the timelines required by applicable law. If you are not satisfied, you may escalate to the Data Protection Board of India.
      </p>
    </LegalPage>
  );
}
