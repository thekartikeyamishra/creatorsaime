"use client";

import { useMemo } from "react";
import { gstModeFor, invoiceTotals, rupeesInWords, type InvoiceLine } from "@/lib/tools";
import { inr2, L, NextStep, Num, Panel, Pick, Text, Toggle, useSaved } from "./kit";

const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir",
  "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Puducherry",
  "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Chandigarh", "Andaman and Nicobar Islands",
  "Dadra and Nagar Haveli and Daman and Diu", "Lakshadweep",
];
const today = () => new Date().toISOString().slice(0, 10);

const INITIAL = {
  number: "INV-001",
  date: "",
  due: "",
  fromName: "",
  fromAddress: "",
  fromState: "Uttar Pradesh",
  pan: "",
  registered: false,
  gstin: "",
  sac: "998361",
  upi: "",
  toName: "",
  toAddress: "",
  toState: "Uttar Pradesh",
  toGstin: "",
  abroad: false,
  tds: 10,
  lines: [{ description: "Instagram Reel — Diwali menu launch", qty: 1, rate: 5000 }] as InvoiceLine[],
  notes: "Thank you! Payment within 7 days via UPI or bank transfer.",
};

export function InvoiceGenerator() {
  const [s, set, reset] = useSaved("gst-invoice-generator", INITIAL);
  const mode = gstModeFor(s.registered, s.fromState, s.toState, s.abroad);
  const t = useMemo(() => invoiceTotals(s.lines, mode, s.tds), [s.lines, mode, s.tds]);
  const up = <K extends keyof typeof INITIAL>(k: K) => (v: (typeof INITIAL)[K]) => set((p) => ({ ...p, [k]: v }));
  const setLine = (i: number, patch: Partial<InvoiceLine>) => set((p) => ({ ...p, lines: p.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) }));
  const stateOpts = STATES.map((x) => [x, x] as [string, string]);
  const date = s.date || today();

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1.05fr]">
      <Panel className="no-print space-y-6">
        <fieldset className="grid gap-4 sm:grid-cols-3">
          <legend className="mb-2 text-sm font-semibold">Invoice</legend>
          <L label="Number" htmlFor="iv-n"><Text id="iv-n" value={s.number} onChange={up("number")} maxLength={30} /></L>
          <L label="Date" htmlFor="iv-d"><input id="iv-d" type="date" value={date} onChange={(e) => up("date")(e.target.value)} className="block w-full rounded-xl bg-white px-3 py-2.5 text-[15px] ring-1 ring-line" /></L>
          <L label="Due date" htmlFor="iv-due"><input id="iv-due" type="date" value={s.due} onChange={(e) => up("due")(e.target.value)} className="block w-full rounded-xl bg-white px-3 py-2.5 text-[15px] ring-1 ring-line" /></L>
        </fieldset>
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 text-sm font-semibold">From (you)</legend>
          <L label="Name / business name" htmlFor="iv-fn"><Text id="iv-fn" value={s.fromName} onChange={up("fromName")} placeholder="Riya Sharma" /></L>
          <L label="State" htmlFor="iv-fs"><Pick id="iv-fs" value={s.fromState} onChange={up("fromState")} options={stateOpts} /></L>
          <L label="Address" htmlFor="iv-fa"><Text id="iv-fa" value={s.fromAddress} onChange={up("fromAddress")} maxLength={160} /></L>
          <L label="PAN" htmlFor="iv-pan" hint="Brands need it to deduct TDS correctly."><Text id="iv-pan" value={s.pan} onChange={(v) => up("pan")(v.toUpperCase())} maxLength={10} /></L>
          <L label="UPI ID" htmlFor="iv-upi"><Text id="iv-upi" value={s.upi} onChange={up("upi")} placeholder="name@bank" maxLength={60} /></L>
          <div className="flex flex-col justify-end gap-3">
            <Toggle checked={s.registered} onChange={up("registered")} label="I am GST-registered" />
          </div>
          {s.registered && <L label="Your GSTIN" htmlFor="iv-g"><Text id="iv-g" value={s.gstin} onChange={(v) => up("gstin")(v.toUpperCase())} maxLength={15} /></L>}
          {s.registered && <L label="SAC code" htmlFor="iv-sac" hint="Service code on your GST registration — confirm with your CA."><Text id="iv-sac" value={s.sac} onChange={up("sac")} maxLength={8} /></L>}
        </fieldset>
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-2 text-sm font-semibold">Bill to (client)</legend>
          <L label="Client name" htmlFor="iv-tn"><Text id="iv-tn" value={s.toName} onChange={up("toName")} placeholder="Spice Route Café" /></L>
          {!s.abroad && <L label="Client state" htmlFor="iv-ts"><Pick id="iv-ts" value={s.toState} onChange={up("toState")} options={stateOpts} /></L>}
          <L label="Client address" htmlFor="iv-ta"><Text id="iv-ta" value={s.toAddress} onChange={up("toAddress")} maxLength={160} /></L>
          {!s.abroad && <L label="Client GSTIN (optional)" htmlFor="iv-tg"><Text id="iv-tg" value={s.toGstin} onChange={(v) => up("toGstin")(v.toUpperCase())} maxLength={15} /></L>}
          <div className="sm:col-span-2"><Toggle checked={s.abroad} onChange={up("abroad")} label="Client is outside India (export of services)" /></div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Items</legend>
          <div className="space-y-3">
            {s.lines.map((l, i) => (
              <div key={i} className="grid grid-cols-[1fr_4.5rem_7rem_auto] items-end gap-2">
                <L label={i === 0 ? "Description" : ""} htmlFor={`iv-l${i}`}><Text id={`iv-l${i}`} value={l.description} onChange={(v) => setLine(i, { description: v })} /></L>
                <L label={i === 0 ? "Qty" : ""} htmlFor={`iv-q${i}`}><Num id={`iv-q${i}`} value={l.qty} onChange={(v) => setLine(i, { qty: v })} max={1000} /></L>
                <L label={i === 0 ? "Rate" : ""} htmlFor={`iv-r${i}`}><Num id={`iv-r${i}`} prefix="₹" value={l.rate} onChange={(v) => setLine(i, { rate: v })} max={100_000_000} /></L>
                <button type="button" aria-label="Remove item" disabled={s.lines.length === 1} onClick={() => set((p) => ({ ...p, lines: p.lines.filter((_, j) => j !== i) }))} className="mb-1 rounded-lg px-2 py-2 text-muted hover:bg-red-50 hover:text-red-600 disabled:opacity-30">✕</button>
              </div>
            ))}
          </div>
          {s.lines.length < 12 && (
            <button type="button" onClick={() => set((p) => ({ ...p, lines: [...p.lines, { description: "", qty: 1, rate: 0 }] }))} className="mt-3 text-sm font-medium text-brand">+ Add item</button>
          )}
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <L label="Expected TDS by client (%)" htmlFor="iv-tds" hint="Many brands deduct 10% on professional fees; some use 1–2%. Ask your client. Use 0 if none."><Num id="iv-tds" value={s.tds} onChange={up("tds")} max={30} step={0.5} /></L>
          <L label="Notes" htmlFor="iv-no"><Text id="iv-no" value={s.notes} onChange={up("notes")} maxLength={240} /></L>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" data-magnetic onClick={() => window.print()} className="rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-white">Print / Save as PDF</button>
          <button type="button" onClick={reset} className="rounded-xl px-4 py-2.5 text-sm text-muted ring-1 ring-line hover:text-ink">Start over</button>
        </div>
      </Panel>

      {/* The printable document */}
      <div className="print-area rounded-2xl bg-white p-6 text-[13px] leading-5 text-ink shadow-sm ring-1 ring-line sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-semibold">{s.fromName || "Your name"}</p>
            <p className="whitespace-pre-line text-muted">{s.fromAddress}{s.fromAddress ? "\n" : ""}{s.fromState}</p>
            {s.pan && <p>PAN: {s.pan}</p>}
            {s.registered && s.gstin && <p>GSTIN: {s.gstin}</p>}
          </div>
          <div className="text-right">
            <p className="text-xl font-semibold tracking-tight">{s.registered ? "TAX INVOICE" : "INVOICE"}</p>
            <p>No. {s.number}</p>
            <p>Date: {date}</p>
            {s.due && <p>Due: {s.due}</p>}
          </div>
        </div>
        <div className="mt-6 rounded-xl bg-paper p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Bill to</p>
          <p className="font-medium">{s.toName || "Client name"}</p>
          <p className="text-muted">{s.toAddress}{s.abroad ? " (outside India)" : `${s.toAddress ? ", " : ""}${s.toState}`}</p>
          {!s.abroad && s.toGstin && <p>GSTIN: {s.toGstin}</p>}
          {s.registered && !s.abroad && <p className="text-muted">Place of supply: {s.toState}</p>}
        </div>
        <table className="mt-5 w-full text-left">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-muted"><th className="py-2">Description</th><th className="py-2 text-right">Qty</th><th className="py-2 text-right">Rate</th><th className="py-2 text-right">Amount</th></tr>
          </thead>
          <tbody>
            {s.lines.map((l, i) => (
              <tr key={i} className="border-b border-line/70"><td className="py-2 pr-2">{l.description || "—"}{s.registered && s.sac && <span className="block text-[11px] text-muted">SAC {s.sac}</span>}</td><td className="py-2 text-right tabular-nums">{l.qty}</td><td className="py-2 text-right tabular-nums">{inr2(l.rate)}</td><td className="py-2 text-right tabular-nums">{inr2(l.qty * l.rate)}</td></tr>
            ))}
          </tbody>
        </table>
        <div className="ml-auto mt-4 w-full max-w-xs space-y-1 tabular-nums">
          <Row k="Subtotal" v={inr2(t.subtotal)} />
          {mode === "intra" && <><Row k="CGST @ 9%" v={inr2(t.cgst)} /><Row k="SGST @ 9%" v={inr2(t.sgst)} /></>}
          {mode === "inter" && <Row k="IGST @ 18%" v={inr2(t.igst)} />}
          <Row k="Total" v={inr2(t.total)} bold />
          {s.tds > 0 && !s.abroad && <><Row k={`Less TDS @ ${s.tds}% (if deducted)`} v={`− ${inr2(t.tds)}`} muted /><Row k="Net payable" v={inr2(t.expectedCredit)} bold /></>}
        </div>
        <p className="mt-3 text-[12px] text-muted">Amount in words: {rupeesInWords(t.total)}</p>
        {mode === "export" && <p className="mt-2 text-[12px]">Export of services under LUT without payment of IGST.</p>}
        {!s.registered && <p className="mt-2 text-[12px] text-muted">Supplier not registered under GST.</p>}
        {s.upi && <p className="mt-4 rounded-lg bg-blue-50 px-3 py-2 text-[13px]">Pay by UPI: <b>{s.upi}</b></p>}
        {s.notes && <p className="mt-4 text-[13px]">{s.notes}</p>}
      </div>
      <div className="xl:col-span-2 no-print">
        <NextStep from="invoice" title="Stop chasing this invoice yourself." body="In CreatorsAI's free Deal Desk, every deal gets a numbered invoice automatically, overdue payments are flagged, and one tap sends a polite WhatsApp reminder with your UPI ID — in Hindi or English." />
      </div>
    </div>
  );
}

function Row({ k, v, bold, muted }: { k: string; v: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 ${bold ? "border-t border-line pt-1 font-semibold" : ""} ${muted ? "text-muted" : ""}`}>
      <span>{k}</span>
      <span>{v}</span>
    </div>
  );
}
