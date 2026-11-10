import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui";
import { site } from "@/lib/config";

export const metadata = {
  title: "Contact",
  description: "Contact CreatorsAI — support, partnerships, city chapters and grievances.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  const items = [
    { t: "Start a City Chapter", d: "Run a creator community or events in your city? Tell us about it — city, community size and what you organise today.", s: "City Chapter proposal" },
    { t: "Brands & partnerships", d: "Want a managed pilot campaign or an event partnership? Share your city, objective and timeline.", s: "Brand partnership" },
    { t: "Support", d: "Questions about your invite, profile or verification.", s: "Support request" },
  ];
  return (
    <>
      <PageHeader eyebrow="Contact" title="Talk to a real person." intro="Early access is founder-led. Every message is read by a human." />
      <section className="container-page grid gap-6 py-16 md:grid-cols-3">
        {items.map((i) => (
          <Card key={i.t}>
            <h2 className="text-lg font-semibold">{i.t}</h2>
            <p className="mt-2 text-sm text-muted">{i.d}</p>
            <a className="mt-4 inline-block text-sm font-medium text-brand hover:underline" href={`mailto:${site.supportEmail}?subject=${encodeURIComponent(i.s)}`}>
              {site.supportEmail} →
            </a>
          </Card>
        ))}
      </section>
      <section className="container-page pb-20 text-sm text-muted">
        Privacy or legal concerns: <a className="font-medium text-brand hover:underline" href="/grievance">Grievance Redressal</a>.
      </section>
    </>
  );
}
