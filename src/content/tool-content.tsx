import Link from "next/link";
import type { ReactNode } from "react";

export type ToolContent = {
  h1: string;
  intro: string;
  /** Explainer sections rendered under the tool (static, crawlable, genuinely useful). */
  sections: Array<{ h2: string; body: ReactNode }>;
  faq: Array<{ q: string; a: string }>;
  guides: string[];
};

export const TOOL_CONTENT: Record<string, ToolContent> = {
  "rate-calculator": {
    h1: "Creator rate calculator for India",
    intro:
      "Work out a fair fee for a Reel, Story or YouTube video from the thing brands actually pay for — views — then adjust for your niche, usage rights and exclusivity. Every assumption is shown and editable.",
    sections: [
      {
        h2: "How the estimate works",
        body: (
          <>
            <p>
              The calculator multiplies your <b>average views</b> by a <b>₹ per 1,000 views</b> range for the format, then applies three multipliers: your niche, paid usage rights
              (+20% for every three months a brand may run your content as an ad) and category exclusivity (+25%). Results are rounded to the nearest ₹100.
            </p>
            <p>
              The default per-1,000-view ranges are starting assumptions, not market data. Rates in Indian tier-2 and tier-3 cities are often lower than metro rates, while finance and
              tech audiences usually command more. If you know what creators near you charge, open <i>Adjust the ₹ per 1,000 views assumption</i> and put in your own numbers.
            </p>
          </>
        ),
      },
      {
        h2: "Why views beat followers",
        body: (
          <p>
            Brands pay for attention. A 50,000-follower account whose Reels get 3,000 views is worth less to a café than a 9,000-follower account whose Reels get 15,000 views from the
            same city. Use the <b>median</b> views of your last ten posts — one viral video will make every future quote look overpriced.
          </p>
        ),
      },
      {
        h2: "Turning the number into a quote",
        body: (
          <ul>
            <li>Quote the suggested fee, not the bottom of the range — you can always offer a bundle discount.</li>
            <li>Price usage rights separately. A Reel the brand boosts for six months is a TV-style ad, not a post.</li>
            <li>Ask for 50% upfront from new clients, and put the balance due date in writing.</li>
            <li>For barter deals, value the products honestly — gifted products can be taxable income.</li>
          </ul>
        ),
      },
    ],
    faq: [
      { q: "How much should I charge for one Instagram Reel in India?", a: "Start from your median views. With the default assumptions, a Reel averaging 10,000 views in the food niche lands around ₹2,000–₹5,000; finance or tech content with the same views lands higher. Adjust the assumption to match what creators in your city actually charge." },
      { q: "Should a brand pay more to use my Reel in their ads?", a: "Yes. Paid usage rights let the brand run your content as an advertisement, which is worth more than an organic post. The calculator adds 20% for every three months of paid usage." },
      { q: "Is this based on real deal data?", a: "No — it is a transparent formula with editable assumptions. CreatorsAI members also see the Rate & Results Index, built only from completed, paid deals that both sides confirmed." },
    ],
    guides: ["how-much-to-charge-for-instagram-reel-india", "influencer-collaboration-agreement-india"],
  },

  "gst-invoice-generator": {
    h1: "GST invoice generator for creators",
    intro:
      "Make a clean, numbered invoice in a minute: CGST + SGST for clients in your state, IGST for other states, zero-rated export for clients abroad, and a TDS-aware net amount. Print it or save it as a PDF — nothing leaves your device.",
    sections: [
      {
        h2: "Which GST applies to my invoice?",
        body: (
          <table>
            <thead>
              <tr><th>Your situation</th><th>What the invoice shows</th></tr>
            </thead>
            <tbody>
              <tr><td>Not GST-registered</td><td>No GST. The invoice says the supplier is not registered.</td></tr>
              <tr><td>Registered, client in the same state</td><td>CGST 9% + SGST 9%</td></tr>
              <tr><td>Registered, client in another state</td><td>IGST 18%</td></tr>
              <tr><td>Registered, client outside India</td><td>Export of services — zero-rated when you have filed a Letter of Undertaking (LUT)</td></tr>
            </tbody>
          </table>
        ),
      },
      {
        h2: "When do creators need GST registration?",
        body: (
          <p>
            Registration becomes mandatory once your aggregate turnover from services crosses ₹20 lakh in a financial year (₹10 lakh in special-category states). Many creators register
            earlier because large brands ask for a GSTIN. Read our <Link href="/guides/gst-tds-for-creators-india">GST &amp; TDS guide for creators</Link> for the details.
          </p>
        ),
      },
      {
        h2: "Why the net amount is lower than the total",
        body: (
          <p>
            Businesses often deduct TDS before paying you — commonly 10% on professional fees, though some brands treat creator work as a contract and deduct 1–2%. TDS is calculated on
            the amount before GST. It is not lost: it is credited against your PAN and you claim it when you file your income-tax return. Ask the client which rate they use and set it in
            the form so your expected bank credit is right.
          </p>
        ),
      },
    ],
    faq: [
      { q: "Can I make an invoice without GST registration?", a: "Yes. If you are not registered, issue a regular invoice without GST. Do not charge GST or show a GSTIN you don't have." },
      { q: "What is the SAC code for influencer services?", a: "Use the service code on your own GST registration. Advertising-related services are commonly classified under 9983 codes; confirm the exact code with your chartered accountant." },
      { q: "Is my data stored?", a: "Only in your own browser, so you can come back and continue. Nothing is sent to our servers." },
    ],
    guides: ["gst-tds-for-creators-india", "how-to-get-paid-on-time-creator"],
  },

  "collab-agreement-generator": {
    h1: "Brand collaboration agreement generator",
    intro:
      "Most creator disputes come from things nobody wrote down: revision rounds, when the balance is due, whether the brand can boost your Reel. This generator writes those terms in plain language, ready to send over email or WhatsApp.",
    sections: [
      {
        h2: "The clauses that prevent most disputes",
        body: (
          <ul>
            <li><b>Deliverables and dates</b> — format, length, number of posts and a posting deadline.</li>
            <li><b>Revisions</b> — how many rounds, and what silence means.</li>
            <li><b>Payment</b> — advance, balance due date and late-payment interest.</li>
            <li><b>Usage rights</b> — organic only, or paid ads for a fixed period.</li>
            <li><b>Ad disclosure</b> — both sides commit to the ASCI label and the platform tag.</li>
            <li><b>Cancellation</b> — a kill fee if the brand cancels after you start.</li>
          </ul>
        ),
      },
      {
        h2: "Is a WhatsApp “OK” legally valid?",
        body: (
          <p>
            In India, a contract can be formed over email or messaging when both sides clearly agree to the same terms. The problem is proving <i>which</i> terms were agreed. Sending this
            agreement and getting a clear “Agreed” reply in the same thread gives you a written record. For high-value or long-term work, have a lawyer review the final text.
          </p>
        ),
      },
    ],
    faq: [
      { q: "Do I need a contract for a ₹5,000 collaboration?", a: "A short written agreement is worth it for any paid deal: it takes two minutes and settles fee, dates and revisions before work starts." },
      { q: "What is a kill fee?", a: "A payment you receive if the brand cancels after you have started work. 25–50% of the fee is common." },
      { q: "Who owns the content?", a: "By default in this template, the creator owns the content and the brand gets the usage rights you choose. Change it only if you are paid for it." },
    ],
    guides: ["influencer-collaboration-agreement-india", "asci-ad-disclosure-rules-india"],
  },

  "ad-disclosure-checker": {
    h1: "Ad disclosure checker for Indian creators",
    intro:
      "Paste a caption and see instantly whether it carries an ASCI-permitted label upfront — before you post, not after a notice. It runs entirely in your browser.",
    sections: [
      {
        h2: "What the checker looks for",
        body: (
          <ul>
            <li>A permitted label: Advertisement, Ad, Sponsored, Collaboration, Partnership, Employee or Free gift.</li>
            <li>The label in the first lines, visible before a reader taps “more”.</li>
            <li>The label not hidden after a run of other hashtags.</li>
            <li>Vague tags such as #collab, #spon or #gifted used instead of a clear label.</li>
          </ul>
        ),
      },
      {
        h2: "When do you need to disclose?",
        body: (
          <p>
            Whenever there is a material connection with the brand — payment, free products, a trip, an affiliate commission or employment — and the post promotes it. Disclose even when
            your opinion is honest. In videos, also say or show the label at the start. Read the <Link href="/guides/asci-ad-disclosure-rules-india">full guide to ASCI disclosure rules</Link>.
          </p>
        ),
      },
    ],
    faq: [
      { q: "Is #collab enough?", a: "Use the full word “Collaboration” or a clearer label like “Ad”. Short forms and vague tags may not be understood by an average viewer." },
      { q: "Does the Instagram Paid partnership tag count?", a: "Yes, ASCI recognises it. Using it together with a label in the caption is the safest approach." },
      { q: "Is this legal advice?", a: "No. It is a quick check against the published guidelines to catch common mistakes." },
    ],
    guides: ["asci-ad-disclosure-rules-india"],
  },

  "engagement-rate-calculator": {
    h1: "Engagement rate calculator",
    intro:
      "Calculate engagement two ways — by followers and by views — and learn which one to put in your media kit. Your numbers stay on your device.",
    sections: [
      {
        h2: "The formulas",
        body: (
          <ul>
            <li><b>By followers:</b> (likes + comments + saves + shares) ÷ followers × 100</li>
            <li><b>By views:</b> (likes + comments + saves + shares) ÷ views × 100</li>
          </ul>
        ),
      },
      {
        h2: "Which number should I show brands?",
        body: (
          <p>
            Show both, and lead with engagement by views plus your median views. Follower-based rates reward old audiences that no longer watch; view-based rates show how the people who
            actually see your content react. Saves and shares matter most — they signal intent, which is what a local business is paying for.
          </p>
        ),
      },
    ],
    faq: [
      { q: "What is a good engagement rate on Instagram?", a: "It depends on account size and niche. As a rough guide, 1–3% is healthy, above 3% is strong. Smaller accounts naturally score higher than very large ones." },
      { q: "Should I count views in engagement?", a: "No — views are the denominator for the by-views rate, not an interaction." },
    ],
    guides: ["how-much-to-charge-for-instagram-reel-india", "measure-roi-of-local-creator-campaign"],
  },
};
