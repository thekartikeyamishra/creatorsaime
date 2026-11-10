import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { Badge, ButtonLink } from "@/components/ui";
import { COHORT_CITIES, site } from "@/lib/config";

export const metadata = { alternates: { canonical: "/", languages: { "en-IN": "/", "hi-IN": "/hi" } } };

const faqs = [
  {
    q: "Is CreatorsAI free for creators?",
    a: "Yes. Creating your profile, building your Trust Passport, discovering opportunities and applying are free, permanently. We never charge creators to apply. CreatorsAI earns when brands run successful, managed campaigns.",
  },
  {
    q: "Why is it invite-only?",
    a: "Brands only trust a network where every creator is real and verified. We onboard a curated first cohort city by city, verify each account, and only then open campaigns. Quality before scale.",
  },
  {
    q: "I'm a nano or micro creator. Can I join?",
    a: "Absolutely. Follower count is not the only signal we look at. Reliability, local relevance, content quality and verified ownership matter more to the brands we work with.",
  },
  {
    q: "What is a Creator Pod?",
    a: "A small verified team — for example a food creator, a local community creator and a photographer — hired together for one coordinated campaign. Pods let individual creators access bigger projects.",
  },
  {
    q: "Do I have to stop using WhatsApp, UPI or my existing clients?",
    a: "No. CreatorsAI works alongside them. Log deals with clients who aren't on the platform, send reminders and agreements through WhatsApp, and keep getting paid by UPI, bank transfer or cash. You can export all your data any time.",
  },
  {
    q: "Which cities are you starting with?",
    a: `We're curating our first cohort in ${COHORT_CITIES.join(" and ")}. You can request an invite from anywhere in India; we'll be honest about when we can serve your city.`,
  },
  {
    q: "How do you handle my data?",
    a: "We collect only what's needed to run the network, never sell personal data, and let you download your data or request deletion at any time. Marketing messages are opt-in and separate from essential account emails.",
  },
];

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: site.name,
            url: site.url,
            logo: `${site.url}/icons/icon-512.png`,
            founder: { "@type": "Person", name: site.founder, sameAs: [site.xUrl] },
            sameAs: [site.xUrl],
            slogan: site.tagline,
            email: site.supportEmail,
          },
          { "@context": "https://schema.org", "@type": "WebSite", name: site.name, url: site.url, description: site.description, inLanguage: "en-IN" },
        ]}
      />

      {/* Hero */}
      <section className="grid-glow relative overflow-hidden bg-ink text-white">
        <div className="container-page grid gap-12 py-20 sm:py-28 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <Badge tone="teal">Invite-only · First cohort now forming</Badge>
            <h1 className="text-balance mt-6 text-4xl font-semibold tracking-tight sm:text-6xl">
              Your next collaboration <span className="bg-gradient-to-r from-blue-400 to-teal bg-clip-text text-transparent">starts here.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-slate-300">
              A growing network of creators, brands and communities building real opportunities together — verified, fairly paid and local first.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/join?role=creator" className="!px-6 !py-3 text-base">Join as a Creator</ButtonLink>
              <ButtonLink href="/join?role=brand" variant="light" className="!px-6 !py-3 text-base">Find Your Next Creator</ButtonLink>
            </div>
            <p className="mt-5 text-sm text-slate-400">
              Organise creators in your city?{" "}
              <Link href="/contact?topic=chapter" className="font-medium text-teal underline-offset-4 hover:underline">Start a City Chapter →</Link>
            </p>
          </div>

          <PassportPreview />
        </div>
      </section>

      {/* Why */}
      <section className="container-page py-20" aria-labelledby="why">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-brand">Why CreatorsAI exists</p>
            <h2 id="why" className="text-balance mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">India&apos;s creators are everywhere. Paid work isn&apos;t — yet.</h2>
            <p className="mt-5 text-muted">
              Most creators now come from outside the big metros, yet the majority still land only about one paid brand campaign a year. Brands, meanwhile,
              struggle to find reliable local talent they can trust. The gap isn&apos;t talent. It&apos;s trust, coordination and repeat opportunity.
            </p>
            <p className="mt-4 text-muted">
              CreatorsAI makes money only when a collaboration creates real value — so we&apos;re built to help you earn again and again, not just sign up.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Stat value="66%" label="of India's creators were from non-metro markets in 2025" />
            <Stat value="~1" label="paid campaign a year for most participating creators" />
            <Stat value="6.4×" label="growth in non-metro creator supply, 2020–2025" />
            <Stat value="42,000" label="brand campaigns run in India in 2025" />
            <p className="col-span-2 text-xs text-muted">
              Source: ISB–SRITNE and Hashfame creator-economy research (published July 2026). Historical research estimates, not CreatorsAI user numbers.
            </p>
          </div>
        </div>
      </section>

      {/* Switch trigger: Deal Desk */}
      <section className="border-t border-line bg-white py-20" aria-labelledby="desk">
        <div className="container-page grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-teal-600">Deal Desk · free</p>
            <h2 id="desk" className="text-balance mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Keep WhatsApp. Lose the chaos.</h2>
            <p className="mt-5 text-muted">
              Useful from day one, even if your clients never join. Log the collaborations you already have — we track what&apos;s due, what you&apos;re owed and
              whether it worked.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                ["More money", "Overdue payments flagged; one-tap WhatsApp reminders with your UPI ID; invoices in a click."],
                ["Proof it worked", "Tracked links and promo-code counts show cost per customer — so good creators get rebooked."],
                ["Faster, fewer disputes", "One written agreement both sides OK — your client taps a private link, no account needed."],
              ].map(([t, d]) => (
                <li key={t} className="flex gap-3">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-teal" aria-hidden />
                  <span><strong>{t}.</strong> <span className="text-muted">{d}</span></span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/why-switch" variant="secondary">Why switch? Old way vs new →</ButtonLink>
            </div>
          </div>
          <DeskPreview />
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-y border-line bg-white py-20" aria-labelledby="how">
        <div className="container-page">
          <h2 id="how" className="text-3xl font-semibold tracking-tight sm:text-4xl">How it works</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <Steps
              title="For creators & creative professionals"
              steps={[
                ["Request your invite", "Tell us your city, niche and public profile. Takes under a minute."],
                ["Verify & build your Trust Passport", "Prove account ownership and turn your work into a shareable, verified portfolio."],
                ["Get matched to real work", "Relevant campaigns, Creator Pods and local events — no paying to apply, ever."],
              ]}
            />
            <Steps
              title="For brands & local businesses"
              steps={[
                ["Share what you want to promote", "Your objective, city and budget range. We reply personally."],
                ["Receive a curated shortlist", "Verified, available creators — or a ready-made Creator Pod — matched to your goal."],
                ["Run it with clear terms", "Agreed deliverables, usage rights and timelines, tracked in one place."],
              ]}
            />
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="container-page grid gap-6 py-20 lg:grid-cols-2" aria-label="Benefits">
        <Benefit
          eyebrow="Creators"
          title="Built to help you earn repeatedly"
          points={[
            "Free forever to join, discover and apply",
            "Creator Trust Passport you can share anywhere — even outside CreatorsAI",
            "Creator Pods: team up for bigger campaigns",
            "Standard deliverables, revision limits and usage rights — no unpaid surprises",
            "City communities, meetups and collaborations",
          ]}
          cta={{ href: "/creators", label: "Learn more for creators" }}
        />
        <Benefit
          eyebrow="Brands"
          title="Reliable creators, coordinated campaigns"
          points={[
            "Only ownership-verified creator profiles",
            "Human-curated shortlists during early access",
            "One coordinated Creator Pod instead of chasing five people",
            "Transparent deliverables and reporting — never guaranteed virality",
            "Local reach in cities big agencies overlook",
          ]}
          cta={{ href: "/brands", label: "Learn more for brands" }}
          dark
        />
      </section>

      {/* Trust */}
      <section className="bg-white py-20" aria-labelledby="trust">
        <div className="container-page">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-600">Verified community</p>
          <h2 id="trust" className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">Trust is the product.</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Ownership verified", "Creators prove they control their accounts. Self-reported metrics are clearly labelled as such."],
              ["Evidence, not opinions", "Feedback is tied to completed work, appealable, and protected against fake or retaliatory reviews."],
              ["People decide", "No algorithm suspends a creator, releases disputed money or labels anyone a fraud. Humans review."],
              ["No fake activity", "No invented brands, inflated member counts or fake urgency. What you see is real."],
            ].map(([t, d]) => (
              <div key={t} className="rounded-2xl bg-paper p-5 ring-1 ring-line">
                <h3 className="font-semibold">{t}</h3>
                <p className="mt-2 text-sm text-muted">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pods */}
      <section className="container-page py-20" aria-labelledby="pods">
        <div className="overflow-hidden rounded-3xl bg-ink p-8 text-white sm:p-12">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <Badge tone="blue">Creator Pods</Badge>
              <h2 id="pods" className="text-balance mt-4 text-3xl font-semibold tracking-tight">One brief. One coordinated team.</h2>
              <p className="mt-4 text-slate-300">
                A restaurant chain wants to promote its outlets across Prayagraj. Instead of one influencer, it hires a verified pod — and the network handles roles,
                deliverables, deadlines and payment allocation.
              </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {["Food creator", "Lifestyle creator", "Local community creator", "Videographer", "Photographer"].map((r) => (
                <li key={r} className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
                  <span className="size-2 rounded-full bg-teal" aria-hidden />
                  {r}
                </li>
              ))}
              <li className="rounded-xl px-4 py-3 text-sm text-slate-400">Example for illustration.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Events + founder */}
      <section className="container-page grid gap-6 pb-20 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-8 ring-1 ring-line">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand">Events &amp; meetups</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight">Real rooms, real people.</h2>
          <p className="mt-3 text-muted">
            Creator meetups, workshops and brand-sponsored evenings are part of the network. No events are scheduled yet — early-access members will hear first, and
            we&apos;ll only announce what&apos;s confirmed.
          </p>
        </div>
        <div className="rounded-2xl bg-white p-8 ring-1 ring-line">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-600">From the founder</p>
          <p className="mt-3 text-lg leading-relaxed">
            &ldquo;Talented creators in smaller cities shouldn&apos;t have to move to Mumbai to get paid fairly. I&apos;m building CreatorsAI so that verified local talent and
            serious brands can find each other — and keep working together.&rdquo;
          </p>
          <p className="mt-4 text-sm font-medium">{site.founder}, Founder</p>
          <Link href="/about" className="mt-2 inline-block text-sm font-medium text-brand hover:underline">Read the story →</Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-line bg-white py-20" aria-labelledby="faq">
        <div className="container-page max-w-3xl">
          <h2 id="faq" className="text-3xl font-semibold tracking-tight">Questions, answered</h2>
          <div className="mt-8 divide-y divide-line">
            {faqs.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                  {f.q}
                  <span className="text-muted transition group-open:rotate-45" aria-hidden>+</span>
                </summary>
                <p className="mt-3 text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="grid-glow bg-ink py-20 text-white">
        <div className="container-page text-center">
          <h2 className="text-balance mx-auto max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">Be part of the first verified cohort.</h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-300">Request your invite in under a minute and get a personalised preview straight away.</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/join?role=creator" className="!px-6 !py-3">I&apos;m a Creator</ButtonLink>
            <ButtonLink href="/join?role=brand" variant="light" className="!px-6 !py-3">I&apos;m a Brand</ButtonLink>
            <ButtonLink href="/join?role=professional" variant="ghost" className="!px-6 !py-3 !text-white hover:!bg-white/10">I&apos;m a Creative Professional</ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-line">
      <p className="text-3xl font-semibold tracking-tight text-ink">{value}</p>
      <p className="mt-1 text-sm text-muted">{label}</p>
    </div>
  );
}

function Steps({ title, steps }: { title: string; steps: Array<[string, string]> }) {
  return (
    <div className="rounded-2xl bg-paper p-6 ring-1 ring-line sm:p-8">
      <h3 className="text-lg font-semibold">{title}</h3>
      <ol className="mt-6 space-y-6">
        {steps.map(([t, d], i) => (
          <li key={t} className="flex gap-4">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand text-sm font-semibold text-white">{i + 1}</span>
            <div>
              <p className="font-medium">{t}</p>
              <p className="mt-1 text-sm text-muted">{d}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Benefit({ eyebrow, title, points, cta, dark }: { eyebrow: string; title: string; points: string[]; cta: { href: string; label: string }; dark?: boolean }) {
  return (
    <div className={dark ? "rounded-3xl bg-ink p-8 text-white sm:p-10" : "rounded-3xl bg-white p-8 ring-1 ring-line sm:p-10"}>
      <p className={dark ? "text-sm font-semibold uppercase tracking-wider text-teal" : "text-sm font-semibold uppercase tracking-wider text-brand"}>{eyebrow}</p>
      <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
      <ul className="mt-6 space-y-3">
        {points.map((p) => (
          <li key={p} className="flex gap-3">
            <svg viewBox="0 0 20 20" className="mt-0.5 size-5 shrink-0 text-teal" aria-hidden>
              <path fill="currentColor" d="M8.1 13.6 4.5 10l-1.4 1.4 5 5 9-9-1.4-1.4z" />
            </svg>
            <span className={dark ? "text-slate-200" : "text-ink-2"}>{p}</span>
          </li>
        ))}
      </ul>
      <Link href={cta.href} className={dark ? "mt-8 inline-block font-medium text-teal hover:underline" : "mt-8 inline-block font-medium text-brand hover:underline"}>
        {cta.label} →
      </Link>
    </div>
  );
}

function DeskPreview() {
  const rows: Array<[string, string, string, "red" | "amber" | "green"]> = [
    ["Diwali menu launch", "Spice Route Café", "₹6,000 due · overdue", "red"],
    ["Gym opening reel", "FitHub", "Awaiting their OK", "amber"],
    ["Saree collection shoot", "Kanha Textiles", "Paid · confirmed by both", "green"],
  ];
  return (
    <div className="rounded-3xl bg-paper p-5 ring-1 ring-line sm:p-6" aria-label="Illustrative Deal Desk">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted">Deal Desk</p>
        <Badge tone="slate">Illustrative</Badge>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {[["Still to collect", "₹14,500"], ["Overdue", "₹6,000"], ["Due this week", "3"]].map(([k, v]) => (
          <div key={k} className="rounded-xl bg-white p-3 ring-1 ring-line">
            <p className="text-[11px] text-muted">{k}</p>
            <p className="mt-0.5 text-lg font-semibold tabular-nums">{v}</p>
          </div>
        ))}
      </div>
      <ul className="mt-4 space-y-2">
        {rows.map(([t, c, st, tone]) => (
          <li key={t} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-4 py-3 ring-1 ring-line">
            <span>
              <span className="block text-sm font-medium">{t}</span>
              <span className="text-xs text-muted">with {c}</span>
            </span>
            <Badge tone={tone}>{st}</Badge>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex gap-2">
        <span className="rounded-xl bg-[#25D366] px-3 py-2 text-xs font-semibold text-white">Send payment reminder</span>
        <span className="rounded-xl bg-white px-3 py-2 text-xs font-semibold ring-1 ring-line">Create invoice</span>
      </div>
    </div>
  );
}

function PassportPreview() {
  return (
    <div className="relative" aria-label="Illustrative Creator Trust Passport">
      <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-brand/30 to-teal/20 blur-2xl" aria-hidden />
      <div className="relative rounded-3xl bg-white p-6 text-ink shadow-2xl ring-1 ring-white/20">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Creator Trust Passport</p>
          <Badge tone="slate">Illustrative</Badge>
        </div>
        <div className="mt-5 flex items-center gap-4">
          <div className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-brand to-teal text-xl font-semibold text-white">Y</div>
          <div>
            <p className="font-semibold">Your Name</p>
            <p className="text-sm text-muted">Food &amp; Restaurants · Your city</p>
          </div>
        </div>
        <ul className="mt-6 space-y-3 text-sm">
          {[
            ["Instagram ownership", "Verified", "green"],
            ["Completed campaigns", "Tracked here", "blue"],
            ["On-time delivery", "Evidence-based", "blue"],
            ["Open to Creator Pods", "Yes", "teal"],
          ].map(([k, v, tone]) => (
            <li key={k} className="flex items-center justify-between rounded-xl bg-paper px-4 py-3">
              <span>{k}</span>
              <Badge tone={tone as "green" | "blue" | "teal"}>{v}</Badge>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-xs text-muted">A shareable, evidence-based profile. No opaque scores. You control what&apos;s public.</p>
      </div>
    </div>
  );
}
