import { LegalPage } from "@/components/page-header";
import { POLICY_VERSION, site } from "@/lib/config";

export const metadata = { title: "Refund & Cancellation Policy", description: "CreatorsAI refund and cancellation policy.", alternates: { canonical: "/refund-policy" } };

export default function RefundPage() {
  return (
    <LegalPage title="Refund & Cancellation Policy" updated={POLICY_VERSION}>
      <p>
        Creators never pay on {site.name}. Brands can use the free plan, or buy prepaid Growth time or a Managed Pilot through Razorpay. Plans do not renew
        automatically — you are never charged without choosing to pay.
      </p>
      <h2>Growth plan</h2>
      <ul>
        <li>If you are not satisfied, request a full refund within 7 days of your first Growth purchase, provided you have not published more than one campaign during that time.</li>
        <li>After that, prepaid time is non-refundable, but it never expires early and stacks with any further purchase.</li>
        <li>If we cannot provide the service due to a fault on our side for more than 72 consecutive hours, we will extend your plan by the time lost, or refund it pro-rata on request.</li>
      </ul>
      <h2>Managed Pilot</h2>
      <ul>
        <li>Full refund if you cancel before we share your creator shortlist.</li>
        <li>50% refund if you cancel after the shortlist but before any creator is confirmed.</li>
        <li>No refund once creators are confirmed and work has started. Creator fees are agreed and paid separately and are not covered by this fee.</li>
      </ul>
      <h2>Duplicate or failed payments</h2>
      <p>Duplicate charges, or payments where the service was not activated, are refunded in full. If money was debited but the payment failed, your bank or Razorpay usually reverses it automatically within 5–7 working days.</p>
      <h2>How to request a refund</h2>
      <p>Email <a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a> with your receipt number (CAI-…). Approved refunds are issued to the original payment method within 7 working days of approval.</p>
      <h2>Contact</h2>
      <p><a href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a></p>
    </LegalPage>
  );
}
