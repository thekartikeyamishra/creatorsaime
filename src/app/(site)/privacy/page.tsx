import Link from "next/link";
import { LegalPage } from "@/components/page-header";
import { POLICY_VERSION, site } from "@/lib/config";

export const metadata = { title: "Privacy Policy", description: "How CreatorsAI collects, uses and protects personal data.", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated={POLICY_VERSION}>
      <p>
        This policy explains how {site.name} (&ldquo;we&rdquo;, &ldquo;us&rdquo;), operated by {site.founder}, processes your personal data when you use our website and services. We
        act as a Data Fiduciary under India&apos;s Digital Personal Data Protection Act, 2023 (&ldquo;DPDP Act&rdquo;) and the DPDP Rules, 2025. Where the EU/UK GDPR applies to you,
        we act as a controller.
      </p>

      <h2>1. What we collect</h2>
      <ul>
        <li><strong>Invite requests:</strong> name, email, city, role, category, public profile or business link, content languages, optional answers about your challenges and goals, how you heard about us, and the referral code you used.</li>
        <li><strong>Account data:</strong> email, display name, handle, profile details you choose to add, and authentication data handled by Google Firebase Authentication.</li>
        <li><strong>Verification data:</strong> social account links and handles, the verification code you place in your bio, and for brands, business details (legal name, representative, business email and phone, GSTIN if provided, registered address).</li>
        <li><strong>WhatsApp (optional):</strong> if you connect WhatsApp we store your number (verified with a one-time code) and your alert preferences. If a creator&apos;s client opts in on a deal link, we store that client&apos;s WhatsApp number for that deal only. We keep delivery status of messages, not message contents beyond the template details.</li>
        <li><strong>Consent records:</strong> what you agreed to, when, and which policy version.</li>
        <li><strong>Security data:</strong> request metadata such as IP address, stored only as a salted one-way hash for rate limiting and abuse prevention.</li>
      </ul>
      <p>We do not collect government ID numbers, bank account numbers or card details at this stage.</p>

      <h2>2. Why we use it (purposes)</h2>
      <ul>
        <li>Reviewing invite requests and running an invite-only network.</li>
        <li>Creating and operating your account, profile and Creator Trust Passport.</li>
        <li>Verifying account ownership and business identity to keep the network trustworthy.</li>
        <li>Preventing fraud, spam and abuse, and keeping an audit trail of administrative actions.</li>
        <li>Sending essential service messages about your invite and account.</li>
        <li>Sending marketing updates <em>only</em> if you separately opted in. You can withdraw at any time from your account settings or by emailing us.</li>
      </ul>
      <p>
        We do not sell personal data. We do not use your data to train third-party AI models. WhatsApp messages are service messages about your own account
        or deal, sent only after explicit opt-in; reply STOP to any message, or switch them off in settings or on the deal link, to stop immediately.
      </p>

      <h2>3. What is public</h2>
      <p>
        Nothing is public by default. Your profile and Trust Passport become visible at a public URL only if you switch &ldquo;Make my profile public&rdquo; on. Public pages show your
        display name, handle, city, categories, bio, portfolio links and verified badges — never your email, phone or business documents.
      </p>

      <h2>4. Who processes it</h2>
      <p>
        We use Google Firebase / Google Cloud (authentication, database and hosting infrastructure), Razorpay (payments) and, only if you opt in, Meta&apos;s
        WhatsApp Business Platform (service messages) as processors. Data may be stored on servers outside India; we rely
        on the processor&apos;s contractual and technical safeguards. We will disclose data to authorities only where legally required.
      </p>

      <h2>5. Storage, cookies and local storage</h2>
      <p>
        We do not use advertising or analytics cookies. When you sign in, Firebase stores an authentication session in your browser&apos;s local storage / IndexedDB so you stay
        signed in. Our installable app (PWA) caches public pages on your device for offline use.
      </p>

      <h2>6. Retention</h2>
      <ul>
        <li>Invite requests that never become accounts: deleted within 24 months of your last interaction, or sooner on request.</li>
        <li>Account and profile data: kept while your account is active, then deleted or anonymised after closure unless law requires longer retention.</li>
        <li>Consent records and audit logs: retained as long as needed to demonstrate compliance and security.</li>
        <li>Rate-limit records: automatically deleted within hours.</li>
      </ul>

      <h2>7. Your rights</h2>
      <p>
        You can access a copy of your data (download it from your account), request correction or deletion, withdraw consent, nominate another person to exercise your
        rights in the event of death or incapacity, and raise a grievance. Signed-in users can do this from <Link href="/dashboard/account">Account settings</Link>; anyone can email{" "}
        <a href={`mailto:${site.grievanceEmail}`}>{site.grievanceEmail}</a>. If you are not satisfied with our response, you may approach the Data Protection Board of India (or your
        local supervisory authority under GDPR).
      </p>

      <h2>8. Children</h2>
      <p>CreatorsAI is for users aged 18 and over. We do not knowingly process children&apos;s personal data. If you believe a child has signed up, contact us and we will delete the data.</p>

      <h2>9. Security</h2>
      <p>
        We use encryption in transit and at rest, server-side authorisation for every sensitive operation, strict database access rules, rate limiting, and append-only audit
        logs. No system is perfectly secure; if a personal data breach affects you, we will notify you and the authorities as required by law.
      </p>

      <h2>10. Contact &amp; grievance officer</h2>
      <p>
        Grievance Officer: {site.founder} — <a href={`mailto:${site.grievanceEmail}`}>{site.grievanceEmail}</a>. See <Link href="/grievance">Grievance Redressal</Link>.
      </p>
    </LegalPage>
  );
}
