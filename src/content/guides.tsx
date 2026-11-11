import Link from "next/link";
import type { ReactNode } from "react";

export type Guide = {
  slug: string;
  title: string;
  description: string;
  audience: "Creators" | "Brands" | "Creators & brands";
  published: string;
  updated: string;
  minutes: number;
  takeaways: string[];
  sections: Array<{ id: string; h2: string; body: ReactNode }>;
  sources: Array<{ label: string; url: string }>;
  tools: string[];
};

export const GUIDES: Guide[] = [
  {
    slug: "how-much-to-charge-for-instagram-reel-india",
    title: "How much to charge for an Instagram Reel in India (2026)",
    description: "A practical pricing method for Indian creators: price from views, not followers, add usage rights and exclusivity, and quote with confidence.",
    audience: "Creators",
    published: "2026-11-11",
    updated: "2026-11-11",
    minutes: 7,
    takeaways: [
      "Price from your median views, not your follower count.",
      "Paid usage rights and exclusivity are separate line items — charge for them.",
      "Quote one number with a reason; ask for 50% upfront from new clients.",
    ],
    sections: [
      {
        id: "why-followers-mislead",
        h2: "Why follower count is the wrong starting point",
        body: (
          <>
            <p>
              A café owner in Lucknow does not care how many people followed you in 2023. They care how many people in their city will see the Reel this week. That is why the same
              follower count can justify very different fees. An account with 40,000 followers and 4,000 views per Reel is a smaller media channel than one with 12,000 followers and
              18,000 views.
            </p>
            <p>
              Open your insights and write down the views on your last ten Reels. Ignore your best and worst, and take the middle value — your <b>median views</b>. That number is the
              foundation of every quote.
            </p>
          </>
        ),
      },
      {
        id: "the-formula",
        h2: "A simple, defensible formula",
        body: (
          <>
            <p>
              <b>Fee = median views ÷ 1,000 × your rate per 1,000 views × adjustments.</b> The rate per 1,000 views is the price of attention in your market. Creators in metros and in
              high-value niches (finance, tech, education) can charge more per view than general lifestyle pages in smaller cities.
            </p>
            <table>
              <thead><tr><th>Adjustment</th><th>Why it changes the price</th><th>Typical uplift</th></tr></thead>
              <tbody>
                <tr><td>Niche</td><td>Buyers of credit cards or laptops are worth more to advertisers than casual viewers</td><td>0.9× to 1.4×</td></tr>
                <tr><td>Paid usage rights</td><td>The brand runs your video as an ad — you become their production house</td><td>+20% per 3 months</td></tr>
                <tr><td>Exclusivity</td><td>You turn down competitors for a period</td><td>+25% or more</td></tr>
                <tr><td>Rush delivery</td><td>You move other work</td><td>+15–30%</td></tr>
              </tbody>
            </table>
            <p>
              Try it with your own numbers in the <Link href="/tools/rate-calculator">creator rate calculator</Link> — every assumption is visible and editable, so you can match it to
              your city.
            </p>
          </>
        ),
      },
      {
        id: "packages",
        h2: "Packages that brands say yes to",
        body: (
          <>
            <p>Local businesses rarely want a single post. They want to be seen more than once. Offer three clear options:</p>
            <ol>
              <li><b>Starter:</b> one Reel + one Story with a link sticker.</li>
              <li><b>Launch:</b> one Reel + three Stories across launch week + a pinned comment with the offer.</li>
              <li><b>Results:</b> the Launch package + a tracked link or promo code, with a short report of clicks and redemptions after 14 days.</li>
            </ol>
            <p>
              The third option is where you stand out. Very few creators report results, and a business that can see “₹160 per new customer” will book you again.
            </p>
          </>
        ),
      },
      {
        id: "negotiation",
        h2: "Handling “your rate is too high”",
        body: (
          <>
            <p>Do not drop the price for the same work. Change the work instead:</p>
            <ul>
              <li>Remove usage rights or exclusivity and lower the fee to match.</li>
              <li>Swap the Reel for Stories, which cost less to produce.</li>
              <li>Offer a two-deal bundle with the discount applied to the second deal, paid in advance.</li>
            </ul>
            <blockquote>
              “I understand. For this budget I can do three Stories with your link and offer code instead of a Reel. If you want the Reel later, I&apos;ll hold today&apos;s rate for 30
              days.”
            </blockquote>
          </>
        ),
      },
      {
        id: "barter",
        h2: "Barter deals: free is not free",
        body: (
          <p>
            Products you keep in exchange for content are income. Brands must deduct 10% TDS when the value of benefits they give one person in a financial year crosses ₹20,000 — a rule
            that moved from Section 194R to Section 393 of the Income-tax Act, 2025 from 1 April 2026, with the same rate and threshold. Value barter honestly, put it in your agreement,
            and say no to barter when you need cash. See our <Link href="/guides/gst-tds-for-creators-india">GST and TDS guide</Link>.
          </p>
        ),
      },
    ],
    sources: [
      { label: "Income Tax Department of India", url: "https://www.incometax.gov.in/" },
      { label: "ASCI — Guidelines for influencer advertising in digital media", url: "https://www.ascionline.in/wp-content/uploads/2023/08/GUIDELINES-FOR-INFLUENCER-ADVERTISING-IN-DIGITAL-MEDIA.pdf" },
    ],
    tools: ["rate-calculator", "engagement-rate-calculator"],
  },

  {
    slug: "gst-tds-for-creators-india",
    title: "GST and TDS for content creators in India: a plain-English guide",
    description: "When creators must register for GST, what to charge brands, how TDS on fees and gifted products works after the Income-tax Act, 2025, and what to keep on file.",
    audience: "Creators",
    published: "2026-11-11",
    updated: "2026-11-11",
    minutes: 8,
    takeaways: [
      "GST registration is mandatory above ₹20 lakh aggregate turnover from services (₹10 lakh in special-category states).",
      "Registered creators charge 18% GST to Indian clients: CGST + SGST within the state, IGST across states.",
      "Brands may deduct TDS on your fee and on gifted products above ₹20,000 a year; it is credited against your PAN.",
    ],
    sections: [
      {
        id: "are-you-a-business",
        h2: "First, you are a service provider",
        body: (
          <p>
            For tax purposes, paid collaborations, sponsored videos, affiliate commissions and platform payouts are income from your business or profession. GST treats creators as
            providers of services to brands. Treating your channel like a small business from the first paid deal — separate bank account, numbered invoices, saved agreements — makes
            everything below easier.
          </p>
        ),
      },
      {
        id: "gst-registration",
        h2: "When GST registration becomes mandatory",
        body: (
          <>
            <p>
              You must register once your <b>aggregate turnover</b> from services crosses <b>₹20 lakh</b> in a financial year, or <b>₹10 lakh</b> if you are in a special-category
              state. Aggregate means everything together: brand fees, affiliate income, platform payouts and other services. Advisers differ on how foreign platform income counts towards
              the threshold, so confirm your own position with a chartered accountant.
            </p>
            <p>
              Voluntary registration earlier can make sense: larger brands often insist on a GSTIN, and you can claim input tax credit on equipment and software. The trade-off is monthly or
              quarterly returns.
            </p>
          </>
        ),
      },
      {
        id: "charging-gst",
        h2: "What to charge on your invoice",
        body: (
          <table>
            <thead><tr><th>Client</th><th>GST on your invoice</th></tr></thead>
            <tbody>
              <tr><td>Same state as you</td><td>CGST 9% + SGST 9%</td></tr>
              <tr><td>Different state</td><td>IGST 18%</td></tr>
              <tr><td>Outside India</td><td>Usually export of services — zero-rated if conditions are met and you have filed a Letter of Undertaking (LUT)</td></tr>
              <tr><td>You are not registered</td><td>No GST</td></tr>
            </tbody>
          </table>
        ),
      },
      {
        id: "tds-on-fees",
        h2: "TDS on your fee",
        body: (
          <>
            <p>
              Businesses paying you above the prescribed threshold deduct tax at source. Many treat creator work as a professional fee and deduct 10%; others treat it as an advertising
              contract and deduct 1% (individuals) or 2%. Without a PAN on record, TDS can be 20%. TDS is worked out on the amount before GST when GST is shown separately.
            </p>
            <p>
              From 1 April 2026 the Income-tax Act, 2025 replaced the 1961 Act and consolidated TDS provisions under Section 393, so you may see new section and form numbers on
              certificates. The money is not lost: it appears against your PAN, and you claim it when you file your return. Download your annual information statement regularly and
              match it with your invoices.
            </p>
          </>
        ),
      },
      {
        id: "tds-on-gifts",
        h2: "TDS on gifted products and trips",
        body: (
          <p>
            Products you keep, sponsored stays and trips given because of your work are benefits. When one brand&apos;s benefits to you cross <b>₹20,000 in a financial year</b>, the brand
            must deduct 10% TDS on their value (formerly Section 194R, now under Section 393). Since there is no cash to deduct from, brands often ask you to pay the TDS amount or gross it
            up. Products you return after review are generally not a benefit — keep proof of return.
          </p>
        ),
      },
      {
        id: "records",
        h2: "What to keep on file",
        body: (
          <ul>
            <li>Every invoice, in one numbered series — try the <Link href="/tools/gst-invoice-generator">free GST invoice generator</Link>.</li>
            <li>The agreement or written confirmation for each deal.</li>
            <li>TDS certificates from brands, matched to invoices.</li>
            <li>A list of gifted products with approximate value and whether you returned them.</li>
            <li>Receipts for equipment, software and travel used for work.</li>
          </ul>
        ),
      },
    ],
    sources: [
      { label: "GST portal (registration, LUT, returns)", url: "https://www.gst.gov.in/" },
      { label: "CBIC — GST", url: "https://cbic-gst.gov.in/" },
      { label: "Income Tax Department e-filing portal", url: "https://www.incometax.gov.in/" },
    ],
    tools: ["gst-invoice-generator", "collab-agreement-generator"],
  },

  {
    slug: "influencer-collaboration-agreement-india",
    title: "Influencer collaboration agreements in India: the 10 clauses that matter",
    description: "What every creator–brand agreement should say about deliverables, revisions, payment, usage rights, disclosure and cancellation — with plain-language examples.",
    audience: "Creators & brands",
    published: "2026-11-11",
    updated: "2026-11-11",
    minutes: 6,
    takeaways: [
      "Most disputes are about revisions, payment dates and usage rights — write those down.",
      "A clear written “agreed” on email or WhatsApp is far better than a voice note.",
      "Put ad disclosure in the contract so neither side is surprised.",
    ],
    sections: [
      {
        id: "why",
        h2: "Why small deals need written terms too",
        body: (
          <p>
            Disagreements rarely come from bad intent. They come from two people remembering a call differently: “one revision” versus “until we are happy”, “paid after posting” versus
            “paid at month-end”. A one-page agreement settles that before work starts and protects both sides.
          </p>
        ),
      },
      {
        id: "clauses",
        h2: "The ten clauses",
        body: (
          <ol>
            <li><b>Parties</b> — legal names of the creator and the business.</li>
            <li><b>Deliverables</b> — format, length, number of posts and Stories, links, and posting date.</li>
            <li><b>Brief and creative control</b> — the brand shares key messages; the creator keeps their voice.</li>
            <li><b>Revisions</b> — number of rounds, response time, and what silence means.</li>
            <li><b>Fee and payment</b> — amount, GST, advance, balance due date, late-payment interest, TDS certificate.</li>
            <li><b>Ad disclosure</b> — the label and platform tag both sides will use.</li>
            <li><b>Claims</b> — the brand stands behind product claims; the creator shares genuine opinions.</li>
            <li><b>Usage rights</b> — organic only, or paid ads for a fixed period and platforms.</li>
            <li><b>Exclusivity</b> — which competitors, for how long, and the price of it.</li>
            <li><b>Cancellation</b> — kill fee if the brand cancels; refund if the creator cannot deliver.</li>
          </ol>
        ),
      },
      {
        id: "usage-rights",
        h2: "Usage rights are where money is left on the table",
        body: (
          <p>
            If a brand boosts your Reel or uses it in their own ads, your content is doing the job of a commercial. Price that separately and limit it in time — three, six or twelve
            months — and by platform. When the period ends, the brand stops running it or pays to extend.
          </p>
        ),
      },
      {
        id: "making-it-binding",
        h2: "Making it stick",
        body: (
          <p>
            Send the agreement in the same thread where you discussed the deal and ask for a clear “Agreed”. Keep the thread. For larger or long-term deals, have both sides sign and
            have a lawyer review. Generate a ready-to-send draft with the <Link href="/tools/collab-agreement-generator">collaboration agreement generator</Link>.
          </p>
        ),
      },
    ],
    sources: [{ label: "ASCI — Guidelines for influencer advertising in digital media", url: "https://www.ascionline.in/wp-content/uploads/2023/08/GUIDELINES-FOR-INFLUENCER-ADVERTISING-IN-DIGITAL-MEDIA.pdf" }],
    tools: ["collab-agreement-generator", "rate-calculator"],
  },

  {
    slug: "how-to-get-paid-on-time-creator",
    title: "How to get paid on time as a creator (with Hindi and English reminder templates)",
    description: "A calm, repeatable system for late payments: terms before work, an invoice on posting day, and polite reminders that get answered — templates included.",
    audience: "Creators",
    published: "2026-11-11",
    updated: "2026-11-11",
    minutes: 6,
    takeaways: [
      "Late payment is usually a process problem — fix the process, not the relationship.",
      "Agree the due date in writing and invoice the same day the content goes live.",
      "Remind on day 1, day 4 and day 8 after the due date — short, specific, friendly.",
    ],
    sections: [
      {
        id: "before",
        h2: "Before the work: three sentences that prevent chasing",
        body: (
          <ul>
            <li>“50% advance before shooting, balance within 7 days of the post going live.”</li>
            <li>“Payment by UPI or bank transfer to the details on the invoice.”</li>
            <li>“Please share the name and number of the person who processes payments.”</li>
          </ul>
        ),
      },
      {
        id: "invoice-day",
        h2: "On posting day: send the invoice with the live link",
        body: (
          <p>
            The moment the post is live, send the link, the invoice and your UPI ID in one message. People pay faster when the proof of work and the way to pay are in the same place.
            Use the <Link href="/tools/gst-invoice-generator">free invoice generator</Link> if you don&apos;t have one.
          </p>
        ),
      },
      {
        id: "templates",
        h2: "Reminder templates that keep the relationship warm",
        body: (
          <>
            <h3>Day 1 after the due date</h3>
            <blockquote>Hi Aman, quick reminder that ₹6,000 for the Diwali menu Reel was due yesterday. UPI: riya@okbank. Thank you! 🙏</blockquote>
            <blockquote>नमस्ते अमन जी, दिवाली मेन्यू रील के ₹6,000 कल देय थे — बस याद दिला रही हूँ। UPI: riya@okbank. धन्यवाद! 🙏</blockquote>
            <h3>Day 4</h3>
            <blockquote>Hi Aman, following up on the ₹6,000 balance. Could you share an expected payment date? Happy to resend the invoice if useful.</blockquote>
            <blockquote>नमस्ते अमन जी, ₹6,000 का भुगतान अभी बाकी है। क्या आप अनुमानित तारीख़ बता सकते हैं? ज़रूरत हो तो इनवॉइस दोबारा भेज दूँ।</blockquote>
            <h3>Day 8</h3>
            <blockquote>
              Hi Aman, the ₹6,000 balance is now a week overdue. As per our agreement, please clear it by Friday. I&apos;ve paused new work until then — looking forward to the next
              one!
            </blockquote>
          </>
        ),
      },
      {
        id: "escalate",
        h2: "If nothing works",
        body: (
          <p>
            Call rather than message, and speak to the person who controls payments. Refer to the written agreement and your late-payment clause. For larger amounts, a formal email
            notice or a lawyer&apos;s letter usually resolves things. Avoid public call-outs — they rarely get you paid and can create legal risk.
          </p>
        ),
      },
      {
        id: "automate",
        h2: "Automating the boring part",
        body: (
          <p>
            Tracking due dates in your head does not scale past a few clients. CreatorsAI&apos;s free Deal Desk logs every deal — including clients who aren&apos;t on CreatorsAI — flags
            overdue payments and sends polite reminders like these over WhatsApp in Hindi or English, with your UPI ID included.
          </p>
        ),
      },
    ],
    sources: [{ label: "NPCI — Unified Payments Interface (UPI)", url: "https://www.npci.org.in/what-we-do/upi/product-overview" }],
    tools: ["gst-invoice-generator", "collab-agreement-generator"],
  },

  {
    slug: "asci-ad-disclosure-rules-india",
    title: "ASCI ad disclosure rules for Indian creators, explained",
    description: "When you must label a post as an ad, the labels ASCI accepts, where to put them in captions and videos, and the most common mistakes.",
    audience: "Creators & brands",
    published: "2026-11-11",
    updated: "2026-11-11",
    minutes: 5,
    takeaways: [
      "Disclose whenever there is a material connection: payment, free products, trips, commission or employment.",
      "Use a permitted label upfront: Advertisement, Ad, Sponsored, Collaboration, Partnership, Employee or Free gift.",
      "Both the creator and the brand are responsible.",
    ],
    sections: [
      {
        id: "what",
        h2: "What counts as an ad",
        body: (
          <p>
            The Advertising Standards Council of India&apos;s influencer guidelines apply when you have a <b>material connection</b> with a brand and your content promotes it. Money is
            the obvious case, but free products, sponsored trips, affiliate commissions and being an employee count too. An honest opinion still needs a label if that connection exists.
          </p>
        ),
      },
      {
        id: "labels",
        h2: "Labels that count",
        body: (
          <>
            <p>ASCI lists these labels: <b>Advertisement, Ad, Sponsored, Collaboration, Partnership, Employee, Free gift</b>, and recognises platform tools such as Instagram&apos;s “Paid partnership” tag.</p>
            <p>Vague tags such as #spon, #sp or #gifted on their own can be missed by an average viewer. Write the full word.</p>
          </>
        ),
      },
      {
        id: "where",
        h2: "Where to put the label",
        body: (
          <ul>
            <li><b>Captions:</b> at the start, visible before “more” — not buried after a block of hashtags.</li>
            <li><b>Videos and Reels:</b> overlaid on screen, early and long enough to read; in audio, say it at the beginning.</li>
            <li><b>Stories:</b> on every Story frame that promotes the brand.</li>
            <li><b>Live streams:</b> announce it at the start and periodically.</li>
          </ul>
        ),
      },
      {
        id: "brands",
        h2: "For brands",
        body: (
          <p>
            Brands are responsible too. Put disclosure in your collaboration agreement, never ask a creator to remove a label, and only give claims you can substantiate. Check captions
            before they go live with the <Link href="/tools/ad-disclosure-checker">ad disclosure checker</Link>.
          </p>
        ),
      },
    ],
    sources: [
      { label: "ASCI — Guidelines for influencer advertising in digital media (PDF)", url: "https://www.ascionline.in/wp-content/uploads/2023/08/GUIDELINES-FOR-INFLUENCER-ADVERTISING-IN-DIGITAL-MEDIA.pdf" },
      { label: "ASCI — Influencer do's and don'ts", url: "https://www.ascionline.in/social/dos-dont/" },
    ],
    tools: ["ad-disclosure-checker", "collab-agreement-generator"],
  },

  {
    slug: "measure-roi-of-local-creator-campaign",
    title: "How local businesses can measure the ROI of a creator collaboration",
    description: "A simple method for cafés, salons, gyms and shops: one tracked link, one promo code, and cost per customer — so you rebook creators who bring results.",
    audience: "Brands",
    published: "2026-11-11",
    updated: "2026-11-11",
    minutes: 6,
    takeaways: [
      "Likes are not a business result; customers are.",
      "Give every creator their own link and code so results are attributable.",
      "Judge collaborations by cost per customer, and rebook the ones that win.",
    ],
    sections: [
      {
        id: "what-to-measure",
        h2: "Decide what a result is before you pay",
        body: (
          <p>
            For a café, a result is a table that orders. For a salon, a booked appointment. For a coaching centre, an enquiry that visits. Write the one action you care about into the
            brief, so the creator designs for it and you both know how success will be judged.
          </p>
        ),
      },
      {
        id: "tracking",
        h2: "Two cheap ways to track it",
        body: (
          <ol>
            <li><b>A unique link per creator</b> — to your menu, booking page or WhatsApp. Count clicks.</li>
            <li><b>A unique promo code per creator</b> — “RIYA10”. Ask staff to note redemptions at the counter, or count them in your billing software.</li>
          </ol>
        ),
      },
      {
        id: "the-maths",
        h2: "The only number you need: cost per customer",
        body: (
          <>
            <p><b>Cost per customer = what you paid ÷ customers who came through that creator.</b></p>
            <table>
              <thead><tr><th>Creator</th><th>Fee</th><th>Code redemptions</th><th>Cost per customer</th></tr></thead>
              <tbody>
                <tr><td>Creator A</td><td>₹6,000</td><td>38</td><td>₹158</td></tr>
                <tr><td>Creator B</td><td>₹9,000</td><td>21</td><td>₹429</td></tr>
              </tbody>
            </table>
            <p>
              Creator A cost less per customer even with fewer followers. Compare that with your average order value and repeat rate to decide what a customer is worth, and rebook
              accordingly. Illustrative numbers.
            </p>
          </>
        ),
      },
      {
        id: "fair-to-creators",
        h2: "Be fair: some value is not trackable",
        body: (
          <p>
            Not everyone uses a code; some people visit a week later. Treat tracked results as a floor, not the full picture, and give each collaboration two weeks before judging it.
            Pay on time — the best creators choose the businesses they work with.
          </p>
        ),
      },
      {
        id: "pricing",
        h2: "Paying a fair price",
        body: (
          <p>
            Use the <Link href="/tools/rate-calculator">creator rate calculator</Link> to sanity-check a quote against views, and ask for usage rights only if you will run the content as
            an ad. On CreatorsAI, Growth brands also see what similar collaborations cost and returned in their city, built only from completed, verified deals.
          </p>
        ),
      },
    ],
    sources: [{ label: "ASCI — Guidelines for influencer advertising in digital media", url: "https://www.ascionline.in/wp-content/uploads/2023/08/GUIDELINES-FOR-INFLUENCER-ADVERTISING-IN-DIGITAL-MEDIA.pdf" }],
    tools: ["rate-calculator", "collab-agreement-generator"],
  },
];

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug);
