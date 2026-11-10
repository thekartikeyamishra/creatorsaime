import Link from "next/link";
import { LocaleSetter } from "@/components/locale-setter";
import { Badge, ButtonLink } from "@/components/ui";
import { site } from "@/lib/config";

export const metadata = {
  title: "CreatorsAI — क्रिएटर्स और बिज़नेस के लिए भरोसेमंद नेटवर्क",
  description:
    "Deal Desk मुफ़्त में: हर कोलैबोरेशन का हिसाब, WhatsApp पर payment reminder, invoice और नतीजों का सबूत। वेरिफ़ाइड क्रिएटर्स, भरोसेमंद ब्रांड — WhatsApp और UPI के साथ।",
  alternates: { canonical: "/hi", languages: { "en-IN": "/", "hi-IN": "/hi" } },
  openGraph: { locale: "hi_IN" },
};

const reasons: Array<[string, string]> = [
  ["ज़्यादा कमाई", "बकाया payment एक जगह दिखेगा, एक टैप में WhatsApp reminder (आपकी UPI ID के साथ), और invoice तुरंत।"],
  ["काम का सबूत", "ट्रैक होने वाले link और promo code से पता चलेगा कि किस क्रिएटर से असली ग्राहक आए — ताकि अच्छे क्रिएटर्स को बार-बार काम मिले।"],
  ["कम झगड़े, ज़्यादा भरोसा", "दोनों पक्ष एक ही लिखित शर्तों पर हाँ कहते हैं। आपके क्लाइंट को अकाउंट नहीं बनाना पड़ता — बस link खोल कर हाँ।"],
  ["3 गुना तेज़", "एक brief, एक link — 10 अलग-अलग चैट नहीं। सारे आवेदन, काम और payment एक स्क्रीन पर।"],
];

export default function HindiHome() {
  return (
    <div lang="hi">
      <LocaleSetter locale="hi" />
      <section className="grid-glow bg-ink text-white">
        <div className="container-page py-20 sm:py-28">
          <Badge tone="teal">सिर्फ़ invite से · पहला वेरिफ़ाइड बैच बन रहा है</Badge>
          <h1 className="text-balance mt-6 max-w-3xl text-4xl font-semibold leading-tight sm:text-6xl">
            आपका अगला कोलैबोरेशन <span className="bg-gradient-to-r from-blue-400 to-teal bg-clip-text text-transparent">यहीं से शुरू होता है।</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-slate-300">
            क्रिएटर्स, ब्रांड्स और लोकल कम्युनिटी का भरोसेमंद नेटवर्क — वेरिफ़ाइड, सही दाम पर, और पहले आपके शहर में।
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/join?role=creator" className="!px-6 !py-3 text-base">क्रिएटर के रूप में जुड़ें</ButtonLink>
            <ButtonLink href="/join?role=brand" variant="light" className="!px-6 !py-3 text-base">अपने बिज़नेस के लिए क्रिएटर ढूंढें</ButtonLink>
          </div>
          <p className="mt-5 text-sm text-slate-400">
            <Link href="/" className="underline">Read in English</Link>
          </p>
        </div>
      </section>

      <section className="container-page py-20">
        <p className="text-sm font-semibold uppercase tracking-wider text-teal-600">Deal Desk · मुफ़्त</p>
        <h2 className="text-balance mt-3 text-3xl font-semibold sm:text-4xl">WhatsApp रखिए। गड़बड़ छोड़िए।</h2>
        <p className="mt-4 max-w-2xl text-muted">
          आपका तरीका काम करता है — भरोसे, फ़ोन और WhatsApp पर। CreatorsAI उसे बदलता नहीं, बस उसमें से पैसा और समय रिसने से रोकता है। पहले दिन से काम आता है, चाहे आपके क्लाइंट यहाँ हों या नहीं।
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {reasons.map(([t, d]) => (
            <div key={t} className="rounded-2xl bg-white p-6 ring-1 ring-line">
              <h3 className="text-lg font-semibold">{t}</h3>
              <p className="mt-2 text-muted">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-white py-20">
        <div className="container-page grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-semibold">क्रिएटर्स के लिए हमेशा मुफ़्त</h2>
            <ul className="mt-6 space-y-3 text-muted">
              <li>✓ वेरिफ़ाइड Trust Passport — आपका काम, आपका रिकॉर्ड</li>
              <li>✓ Creator Pods — टीम बना कर बड़े कैंपेन लें, हिस्सा पहले से तय</li>
              <li>✓ Rate Index — आपके शहर में असल में कितना मिलता है, जानिए</li>
              <li>✓ आवेदन करने के कभी पैसे नहीं</li>
            </ul>
          </div>
          <div>
            <h2 className="text-3xl font-semibold">बिज़नेस के लिए</h2>
            <ul className="mt-6 space-y-3 text-muted">
              <li>✓ सिर्फ़ वेरिफ़ाइड क्रिएटर्स — और उनका समय पर काम करने का रिकॉर्ड</li>
              <li>✓ एक brief, एक link, सारे आवेदन एक जगह</li>
              <li>✓ हर ग्राहक पर कितना खर्च हुआ — साफ़ हिसाब</li>
              <li>✓ मुफ़्त शुरुआत; ज़रूरत हो तो Growth प्लान या Managed Pilot</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="grid-glow bg-ink py-20 text-white">
        <div className="container-page text-center">
          <h2 className="text-balance mx-auto max-w-2xl text-3xl font-semibold sm:text-4xl">पहले वेरिफ़ाइड बैच का हिस्सा बनिए।</h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-300">एक मिनट में invite मांगें। जो भी आप करते हैं, उसी से शुरू करें।</p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/join?role=creator" className="!px-6 !py-3">मैं क्रिएटर हूँ</ButtonLink>
            <ButtonLink href="/join?role=brand" variant="light" className="!px-6 !py-3">मेरा बिज़नेस है</ButtonLink>
          </div>
          <p className="mt-8 text-sm text-slate-400">
            {site.founder} द्वारा, सबके सामने बनाया जा रहा है — X पर फ़ॉलो करें{" "}
            <a href={site.xUrl} target="_blank" rel="noopener noreferrer me" className="font-medium text-teal underline">@{site.xHandle}</a>
          </p>
        </div>
      </section>
    </div>
  );
}
