"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "@/components/ui";

const KEY = (slug: string) => `cai.tool.${slug}`;
const RECENT = "cai.tools.recent";

/** State that survives reloads (localStorage), so people can come back and finish. Fails silently. */
export function useSaved<T>(slug: string, initial: T): [T, (v: T | ((p: T) => T)) => void, () => void] {
  const [v, setV] = useState<T>(initial);
  const loaded = useRef(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY(slug));
      if (raw) setV({ ...initial, ...(JSON.parse(raw) as T) });
    } catch {
      /* private mode / blocked storage */
    }
    loaded.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);
  useEffect(() => {
    if (!loaded.current) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(KEY(slug), JSON.stringify(v));
        const list = (JSON.parse(localStorage.getItem(RECENT) || "[]") as Array<{ slug: string; at: number }>).filter((x) => x.slug !== slug);
        localStorage.setItem(RECENT, JSON.stringify([{ slug, at: Date.now() }, ...list].slice(0, 5)));
      } catch {
        /* ignore */
      }
    }, 400); // debounce writes while typing
    return () => clearTimeout(t);
  }, [slug, v]);
  const reset = () => {
    setV(initial);
    try {
      localStorage.removeItem(KEY(slug));
    } catch {
      /* ignore */
    }
  };
  return [v, setV, reset];
}

export function readRecent(): Array<{ slug: string; at: number }> {
  try {
    return JSON.parse(localStorage.getItem(RECENT) || "[]");
  } catch {
    return [];
  }
}

const inputCls =
  "block w-full rounded-xl border-0 bg-white px-3.5 py-2.5 text-[15px] text-ink ring-1 ring-line placeholder:text-slate-400 focus:ring-2 focus:ring-brand focus:outline-none";

export function L({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Num({ id, value, onChange, min = 0, max, step = 1, prefix, placeholder }: { id: string; value: number; onChange: (n: number) => void; min?: number; max?: number; step?: number; prefix?: string; placeholder?: string }) {
  return (
    <div className="relative">
      {prefix && <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-sm text-muted">{prefix}</span>}
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        value={Number.isFinite(value) && value !== 0 ? value : ""}
        onChange={(e) => {
          const n = e.target.value === "" ? 0 : Number(e.target.value);
          onChange(Number.isFinite(n) ? Math.max(min, max !== undefined ? Math.min(max, n) : n) : 0);
        }}
        className={cx(inputCls, prefix && "pl-8")}
      />
    </div>
  );
}

export function Text({ id, value, onChange, placeholder, maxLength = 200 }: { id: string; value: string; onChange: (s: string) => void; placeholder?: string; maxLength?: number }) {
  return <input id={id} value={value} maxLength={maxLength} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={inputCls} />;
}

export function Pick<T extends string>({ id, value, onChange, options }: { id: string; value: T; onChange: (v: T) => void; options: Array<[T, string]> }) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)} className={cx(inputCls, "pr-8")}>
      {options.map(([v, l]) => (
        <option key={v} value={v}>{l}</option>
      ))}
    </select>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (b: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm">
      <span className={cx("relative inline-flex h-6 w-10 shrink-0 rounded-full transition-colors", checked ? "bg-brand" : "bg-slate-300")}>
        <input type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className={cx("absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-[18px]" : "translate-x-0.5")} />
      </span>
      {label}
    </label>
  );
}

export const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
export const inr2 = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Conversion step shown after a result: the tool solves today's problem, the network solves the repeat one. */
export function NextStep({ title, body, role = "creator", from }: { title: string; body: string; role?: "creator" | "brand"; from: string }) {
  return (
    <div data-spotlight className="no-print mt-8 overflow-hidden rounded-2xl bg-ink p-6 text-white sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-wider text-teal">Next step · free for creators</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">{body}</p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link data-magnetic href={`/signup?role=${role}&utm_source=tool&utm_campaign=${from}`} className="inline-flex items-center rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-ink hover:bg-slate-100">
          Create your free account →
        </Link>
        <Link href="/why-switch" className="inline-flex items-center rounded-xl px-4 py-2.5 text-sm font-medium text-slate-300 ring-1 ring-white/20 hover:text-white">
          How CreatorsAI works
        </Link>
      </div>
    </div>
  );
}

export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("rounded-2xl bg-white p-5 shadow-sm ring-1 ring-line sm:p-7", className)}>{children}</div>;
}
