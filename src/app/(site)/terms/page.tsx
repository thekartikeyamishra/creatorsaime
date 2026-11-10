import Link from "next/link";
import { LegalPage } from "@/components/page-header";
import { POLICY_VERSION, site } from "@/lib/config";

export const metadata = { title: "Terms of Service", description: "The terms that govern use of CreatorsAI.", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated={POLICY_VERSION}>
      <p>
        These Terms govern your use of {site.name} (the &ldquo;Service&rdquo;), operated by {site.founder}. By requesting an invite or creating an account you agree to these Terms and
        our <Link href="/privacy">Privacy Policy</Link>.
      </p>
      <h2>1. Eligibility &amp; accounts</h2>
      <ul>
        <li>You must be at least 18 and able to enter a binding contract. Brand accounts must be authorised to act for the business they represent.</li>
        <li>Access is invite-only. Invites are personal, tied to the email they were issued to, and may be revoked.</li>
        <li>Keep your login secure. You are responsible for activity on your account. Tell us promptly about any unauthorised use.</li>
      </ul>
      <h2>2. What CreatorsAI is — and is not, today</h2>
      <p>
        During early access the Service provides invite management, profiles, verification and a curated introduction service. We do not currently collect or hold
        campaign payments. Any future payment features will be provided through authorised payment providers and governed by separate terms presented before use.
      </p>
      <h3>Paid plans for brands</h3>
      <p>
        Brands may buy prepaid Growth plan time or a Managed Pilot service. Prices are shown before payment, payments are processed by Razorpay, plans do not
        renew automatically, and refunds follow our <Link href="/refund-policy">Refund Policy</Link>. Creators are never charged to use CreatorsAI or to apply.
      </p>
      <h2>3. Your content &amp; profile</h2>
      <ul>
        <li>You keep ownership of everything you post. You grant us a non-exclusive, royalty-free licence to host and display it to operate the Service, including on your public profile if you make it public.</li>
        <li>Everything you submit must be accurate and yours to share. Self-reported metrics are labelled as such.</li>
      </ul>
      <h2>4. Verification</h2>
      <p>
        Verification badges mean we reviewed specific evidence (for example, a code in your bio or business details) at a point in time. They are not an endorsement,
        guarantee of performance, or legal certification. We may remove a badge if evidence changes.
      </p>
      <h2>5. Acceptable use</h2>
      <p>
        Follow our <Link href="/community-guidelines">Community Guidelines</Link>. No impersonation, fake engagement, spam, scraping, attempts to bypass security, or
        unlawful content. Paid or incentivised content must carry disclosures required by ASCI guidelines and applicable law.
      </p>
      <h2>6. Suspension</h2>
      <p>We may suspend or close accounts that breach these Terms. Suspensions are reviewed by a person; you can contact us to appeal.</p>
      <h2>7. No guarantees</h2>
      <p>
        We do not guarantee invites, opportunities, earnings, views, sales or campaign outcomes. The Service is provided &ldquo;as is&rdquo; to the extent permitted by law.
      </p>
      <h2>8. Liability</h2>
      <p>
        To the extent permitted by law, we are not liable for indirect or consequential losses, and our total liability for any claim relating to the free Service is
        limited to ₹1,000. Nothing limits liability that cannot be limited by law.
      </p>
      <h2>9. Intellectual property</h2>
      <p>The {site.name} name, logo, software and platform-created databases are owned by {site.founder}. Don&apos;t use them without written permission.</p>
      <h2>10. Changes, law &amp; disputes</h2>
      <p>
        We may update these Terms and will notify members of material changes. These Terms are governed by the laws of India. Please contact us first — most issues can be
        resolved quickly. Courts at Lucknow, Uttar Pradesh have jurisdiction, subject to any mandatory consumer protection rights you have.
      </p>
      <h2>11. Contact</h2>
      <p><a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a></p>
    </LegalPage>
  );
}
