"use client";

import { useMemo, useState } from "react";
import { inr, L, NextStep, Num, Panel, Pick, Text, Toggle, useSaved } from "./kit";

const INITIAL = {
  brand: "",
  creator: "",
  deliverables: "1 Instagram Reel (30–45 s) + 2 Stories with link sticker",
  postBy: "",
  fee: 8000,
  advance: 50,
  payDays: 7,
  revisions: 1,
  usage: "organic" as "organic" | "3m" | "6m" | "12m",
  exclusivityDays: 0,
  barter: false,
  barterValue: 0,
  killFee: 25,
  city: "Prayagraj",
};

const USAGE = { organic: "Organic posting on the Creator's own channels only. Any paid use by the Brand needs a new written agreement.", "3m": "The Brand may use the content in paid ads for 3 months from first posting.", "6m": "The Brand may use the content in paid ads for 6 months from first posting.", "12m": "The Brand may use the content in paid ads for 12 months from first posting." } as const;

export function AgreementGenerator() {
  const [s, set, reset] = useSaved("collab-agreement-generator", INITIAL);
  const [copied, setCopied] = useState(false);
  const up = <K extends keyof typeof INITIAL>(k: K) => (v: (typeof INITIAL)[K]) => set((p) => ({ ...p, [k]: v }));
  const B = s.brand || "[Brand]";
  const C = s.creator || "[Creator]";
  const adv = Math.round((s.fee * s.advance) / 100);

  const text = useMemo(
    () =>
      [
        `BRAND COLLABORATION AGREEMENT`,
        `Between ${B} ("Brand") and ${C} ("Creator").`,
        ``,
        `1. DELIVERABLES`,
        `${s.deliverables}${s.postBy ? `, to be posted on or before ${s.postBy}` : ""}. The Brand will share a brief before production. The Creator keeps creative control of voice and style.`,
        ``,
        `2. APPROVAL & REVISIONS`,
        `The Brand may review a draft once and request up to ${s.revisions} round${s.revisions === 1 ? "" : "s"} of reasonable revisions within 2 working days. Silence after 2 working days counts as approval. Further changes are charged at 20% of the fee per round.`,
        ``,
        `3. FEE & PAYMENT`,
        `Fee: ${inr(s.fee)}${s.barter && s.barterValue ? ` plus products/services worth about ${inr(s.barterValue)} (barter)` : ""}, plus GST if applicable.`,
        `${s.advance > 0 ? `${s.advance}% (${inr(adv)}) is payable before production; the balance` : "The full fee"} is payable within ${s.payDays} days of the content going live. The Brand may deduct TDS as required by law and will share the TDS certificate.`,
        `Payments later than 15 days after the due date attract interest at 1.5% per month.`,
        ``,
        `4. AD DISCLOSURE`,
        `Every post will carry a clear upfront label such as "Ad", "Sponsored" or "Collaboration" and the platform's paid-partnership tag, as required by the ASCI Guidelines for Influencer Advertising. The Brand will not ask the Creator to hide or remove it.`,
        ``,
        `5. CLAIMS`,
        `The Brand is responsible for the accuracy of product claims it provides. The Creator will share only genuine opinions and will not make health, financial or comparative claims that the Brand cannot substantiate.`,
        ``,
        `6. USAGE RIGHTS`,
        `${USAGE[s.usage]} The Creator owns the content. The Brand may reshare the original post with credit.`,
        ``,
        `7. EXCLUSIVITY`,
        s.exclusivityDays > 0 ? `The Creator will not promote a directly competing brand for ${s.exclusivityDays} days after posting.` : `No exclusivity.`,
        ``,
        `8. CANCELLATION`,
        `If the Brand cancels after production starts, ${s.killFee}% of the fee is payable (and the advance is not refundable beyond that). If the Creator cannot deliver, any advance is refunded in full within 7 days.`,
        ``,
        `9. CONTENT STAYS UP`,
        `The Creator will keep the post live for at least 30 days unless the Brand asks for removal.`,
        ``,
        `10. GENERAL`,
        `This is the whole agreement; changes must be in writing (email or WhatsApp is fine). Disputes will first be discussed in good faith; courts at ${s.city || "[city]"}, India have jurisdiction.`,
        ``,
        `Agreed by:`,
        `${B} — name, date: ____________`,
        `${C} — name, date: ____________`,
      ].join("\n"),
    [s, B, C, adv],
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1.05fr]">
      <Panel className="no-print space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <L label="Brand / business" htmlFor="ag-b"><Text id="ag-b" value={s.brand} onChange={up("brand")} placeholder="Spice Route Café" /></L>
          <L label="Creator" htmlFor="ag-c"><Text id="ag-c" value={s.creator} onChange={up("creator")} placeholder="Riya Sharma" /></L>
        </div>
        <L label="Deliverables" htmlFor="ag-d" hint="Be specific: format, length, number of posts/stories, links.">
          <textarea id="ag-d" rows={2} maxLength={400} value={s.deliverables} onChange={(e) => up("deliverables")(e.target.value)} className="block w-full rounded-xl bg-white px-3.5 py-2.5 text-[15px] ring-1 ring-line focus:ring-2 focus:ring-brand focus:outline-none" />
        </L>
        <div className="grid gap-4 sm:grid-cols-3">
          <L label="Post by" htmlFor="ag-p"><input id="ag-p" type="date" value={s.postBy} onChange={(e) => up("postBy")(e.target.value)} className="block w-full rounded-xl bg-white px-3 py-2.5 text-[15px] ring-1 ring-line" /></L>
          <L label="Fee" htmlFor="ag-f"><Num id="ag-f" prefix="₹" value={s.fee} onChange={up("fee")} max={100_000_000} step={500} /></L>
          <L label="Advance %" htmlFor="ag-a"><Num id="ag-a" value={s.advance} onChange={up("advance")} max={100} step={5} /></L>
          <L label="Balance due (days after posting)" htmlFor="ag-pd"><Num id="ag-pd" value={s.payDays} onChange={up("payDays")} max={90} /></L>
          <L label="Revision rounds" htmlFor="ag-r"><Num id="ag-r" value={s.revisions} onChange={(v) => up("revisions")(Math.round(v))} max={5} /></L>
          <L label="Kill fee %" htmlFor="ag-k"><Num id="ag-k" value={s.killFee} onChange={up("killFee")} max={100} step={5} /></L>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <L label="Usage rights" htmlFor="ag-u"><Pick id="ag-u" value={s.usage} onChange={up("usage")} options={[["organic", "Organic only"], ["3m", "Paid ads · 3 months"], ["6m", "Paid ads · 6 months"], ["12m", "Paid ads · 12 months"]]} /></L>
          <L label="Exclusivity (days)" htmlFor="ag-e"><Num id="ag-e" value={s.exclusivityDays} onChange={up("exclusivityDays")} max={365} /></L>
          <L label="Jurisdiction city" htmlFor="ag-city"><Text id="ag-city" value={s.city} onChange={up("city")} maxLength={40} /></L>
        </div>
        <Toggle checked={s.barter} onChange={up("barter")} label="Includes free products / services (barter)" />
        {s.barter && <L label="Approx. value of products" htmlFor="ag-bv" hint="Gifted products above ₹20,000 a year from one brand can attract 10% TDS (formerly Sec 194R, now Sec 393 of the Income-tax Act, 2025)."><Num id="ag-bv" prefix="₹" value={s.barterValue} onChange={up("barterValue")} max={10_000_000} /></L>}
        <div className="flex flex-wrap gap-3">
          <button type="button" data-magnetic onClick={() => navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {})} className="rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-white">{copied ? "Copied ✓" : "Copy agreement"}</button>
          <button type="button" onClick={() => window.print()} className="rounded-xl px-4 py-2.5 text-sm font-medium ring-1 ring-line">Print / PDF</button>
          <button type="button" onClick={reset} className="rounded-xl px-4 py-2.5 text-sm text-muted">Start over</button>
        </div>
      </Panel>
      <div className="print-area rounded-2xl bg-white p-6 shadow-sm ring-1 ring-line sm:p-8">
        <pre className="whitespace-pre-wrap font-sans text-[13.5px] leading-6 text-ink">{text}</pre>
        <p className="no-print mt-6 border-t border-line pt-4 text-xs text-muted">A plain-language starting point, not legal advice. For large or long-term deals, have a lawyer review it.</p>
      </div>
      <div className="xl:col-span-2 no-print">
        <NextStep from="agreement" title="Get it agreed with one tap — not a PDF chase." body="CreatorsAI turns these terms into one deal page both sides confirm. Changes need a fresh OK, deadlines and payments are tracked, and the confirmed deal adds to your verified track record." />
      </div>
    </div>
  );
}
