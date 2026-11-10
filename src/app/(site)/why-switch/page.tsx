import { PageHeader } from "@/components/page-header";
import { ButtonLink, Card } from "@/components/ui";

export const metadata = {
  title: "Why switch? Keep WhatsApp, lose the chaos",
  description:
    "How CreatorsAI helps creators and local businesses collect every rupee, prove results and save hours — without giving up WhatsApp, UPI or the clients they already have.",
  alternates: { canonical: "/why-switch" },
};

const compare: Array<[string, string, string]> = [
  ["Sending a brief to 10 creators", "10 separate chats, the same message re-typed, replies lost in groups", "Write it once, share one link; every reply lands in one list"],
  ["Agreeing the deal", "Voice notes and 'ok done' — nobody remembers the fee or revision count later", "One written page both sides tap to agree; changes need a fresh OK"],
  ["Knowing what's due", "Scrolling back through chats and a notebook", "Due dates and overdue items flagged on one screen"],
  ["Getting paid", "Awkward follow-ups typed from scratch, every time", "One-tap WhatsApp reminder with the amount, balance and your UPI ID"],
  ["Invoicing", "Making one in Word, numbering by memory", "Numbered invoice generated from the deal, print or save as PDF"],
  ["Did it bring customers?", "Guesswork, or 'we got some likes'", "Tracked link clicks + promo-code redemptions → cost per customer"],
  ["Proving your track record", "Screenshots anyone can fake", "Collaborations confirmed by both sides, shown on your Trust Passport"],
];

export default function WhySwitchPage() {
  return (
    <>
      <PageHeader
        eyebrow="Why switch"
        title="Your system works. It just leaks money and time."
        intro="You built your way of working on trust, WhatsApp and phone calls — and it got you here. CreatorsAI doesn't replace any of that. It plugs the leaks: forgotten payments, unclear terms, unproven results and hours of chasing."
      >
        <ButtonLink href="/join?role=creator" className="!px-6 !py-3">I&apos;m a creator</ButtonLink>
        <ButtonLink href="/join?role=brand" variant="light" className="!px-6 !py-3">I run a business</ButtonLink>
      </PageHeader>

      <section className="container-page grid gap-6 py-16 md:grid-cols-3">
        <Reason
          n="1"
          title="It makes you money"
          points={[
            "Every rupee owed, in one place — overdue payments are flagged, not forgotten",
            "Reminders that include your UPI ID, so clients can pay in one tap",
            "Businesses see which creator actually brought customers — and rebook the ones who did",
            "A verified track record that supports higher, better-paid work",
          ]}
        />
        <Reason
          n="2"
          title="It helps you achieve more"
          points={[
            "Creators: team up in Creator Pods for campaigns too big to take alone — with roles, shares and tracked payouts",
            "Businesses: run multi-creator campaigns without hiring an agency",
            "A portable, verified Trust Passport you can share with any brand",
            "Clear written terms that make you look as professional as you are",
          ]}
        />
        <Reason
          n="3"
          title="It's faster — and dependable"
          points={[
            "One brief link instead of re-sending the same message to everyone",
            "Applications, deliverables, payments and invoices on one screen",
            "Both sides agree to the same written terms — fewer disputes",
            "People, not algorithms, make every trust and suspension decision",
          ]}
        />
      </section>

      <section className="bg-white py-16">
        <div className="container-page">
          <h2 className="text-3xl font-semibold tracking-tight">Old way vs CreatorsAI — step by step</h2>
          <div className="mt-8 overflow-x-auto rounded-2xl ring-1 ring-line">
            <table className="w-full min-w-[42rem] text-left text-sm">
              <thead className="bg-paper text-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">Task</th>
                  <th className="px-5 py-3 font-medium">The usual way</th>
                  <th className="px-5 py-3 font-medium text-ink">With CreatorsAI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {compare.map(([task, old, next]) => (
                  <tr key={task}>
                    <td className="px-5 py-4 font-medium">{task}</td>
                    <td className="px-5 py-4 text-muted">{old}</td>
                    <td className="px-5 py-4">{next}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="container-page grid gap-6 py-16 lg:grid-cols-2">
        <Card>
          <h2 className="text-xl font-semibold">Switching costs you nothing</h2>
          <ul className="mt-4 space-y-3 text-muted">
            <li>✓ <strong className="text-ink">Free</strong> for creators, forever. Free for businesses to log deals and post briefs.</li>
            <li>✓ <strong className="text-ink">Keep WhatsApp, UPI and cash.</strong> We send through WhatsApp; you get paid however you already do.</li>
            <li>✓ <strong className="text-ink">Bring your existing clients.</strong> Log deals with anyone — they don&apos;t need an account to agree via a private link.</li>
            <li>✓ <strong className="text-ink">Leave any time.</strong> Download all your data in one click.</li>
          </ul>
        </Card>
        <Card className="bg-ink text-white ring-ink">
          <h2 className="text-xl font-semibold">What you miss by waiting</h2>
          <p className="mt-4 text-slate-300">
            Your verified track record only counts collaborations confirmed on CreatorsAI — it starts the day you log your first deal. Creators and businesses who
            start now will have months of proven, two-sided history when brands are choosing who to hire and who to rebook.
          </p>
          <p className="mt-4 text-slate-300">
            Start with one deal you&apos;re doing this week. If it doesn&apos;t save you time or chase down a payment, you&apos;ve lost nothing.
          </p>
        </Card>
      </section>
    </>
  );
}

function Reason({ n, title, points }: { n: string; title: string; points: string[] }) {
  return (
    <Card>
      <span className="grid size-9 place-items-center rounded-full bg-brand text-sm font-semibold text-white">{n}</span>
      <h2 className="mt-4 text-xl font-semibold">{title}</h2>
      <ul className="mt-4 space-y-2 text-sm text-muted">
        {points.map((p) => (
          <li key={p} className="flex gap-2"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-teal" aria-hidden />{p}</li>
        ))}
      </ul>
    </Card>
  );
}
