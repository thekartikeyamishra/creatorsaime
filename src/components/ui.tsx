import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import Link from "next/link";
import { OptionalTag } from "./optional-tag";

export function cx(...c: Array<string | false | null | undefined>): string {
  return c.filter(Boolean).join(" ");
}

type Variant = "primary" | "secondary" | "ghost" | "danger" | "light";
const variants: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-600 shadow-sm shadow-brand/30",
  secondary: "bg-white text-ink ring-1 ring-line hover:ring-slate-300 hover:bg-slate-50",
  ghost: "text-ink hover:bg-slate-100",
  danger: "bg-red-600 text-white hover:bg-red-700",
  light: "bg-white text-ink hover:bg-slate-100",
};
const base =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60";

export function Button({ variant = "primary", className, loading, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button className={cx(base, variants[variant], className)} disabled={loading || rest.disabled} aria-busy={loading || undefined} {...rest}>
      {loading && <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />}
      {children}
    </button>
  );
}

export function ButtonLink({ href, variant = "primary", className, children }: { href: string; variant?: Variant; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={cx(base, variants[variant], className)}>
      {children}
    </Link>
  );
}

export function Field({ label, htmlFor, error, hint, children, optional }: { label: string; htmlFor: string; error?: string; hint?: string; children: ReactNode; optional?: boolean }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {label} {optional && <OptionalTag />}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

const inputBase =
  "block w-full rounded-xl border-0 bg-white px-3.5 py-2.5 text-sm text-ink ring-1 ring-line placeholder:text-slate-400 focus:ring-2 focus:ring-brand focus:outline-none aria-[invalid=true]:ring-red-500";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputBase, props.className)} />;
}
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={cx(inputBase, "resize-y", props.className)} />;
}
export function Select({ options, placeholder, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { options: readonly string[]; placeholder?: string }) {
  return (
    <select {...props} className={cx(inputBase, "pr-8", props.className)}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  // Defaults apply only when the caller doesn't override them (avoids Tailwind class-order conflicts).
  const c = className ?? "";
  const bg = /(^|\s)bg-/.test(c) ? "" : "bg-white";
  const ring = /(^|\s)ring-(?!1(\s|$))/.test(c) ? (/(^|\s)ring-\d/.test(c) ? "" : "ring-1") : "ring-1 ring-line";
  return <div className={cx("rounded-2xl p-5 sm:p-6", bg, ring, c)}>{children}</div>;
}

const badgeTones = {
  slate: "bg-slate-100 text-slate-700",
  blue: "bg-blue-50 text-blue-700",
  teal: "bg-teal-50 text-teal-700",
  amber: "bg-amber-50 text-amber-800",
  red: "bg-red-50 text-red-700",
  green: "bg-emerald-50 text-emerald-700",
} as const;
export function Badge({ children, tone = "slate" }: { children: ReactNode; tone?: keyof typeof badgeTones }) {
  return <span className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", badgeTones[tone])}>{children}</span>;
}

export function Notice({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "error" | "success" | "warn" }) {
  const t = {
    info: "bg-blue-50 text-blue-900 ring-blue-200",
    error: "bg-red-50 text-red-900 ring-red-200",
    success: "bg-emerald-50 text-emerald-900 ring-emerald-200",
    warn: "bg-amber-50 text-amber-900 ring-amber-200",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cx("rounded-xl px-4 py-3 text-sm ring-1", t)}>
      {children}
    </div>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-muted" role="status">
      <span className="size-5 animate-spin rounded-full border-2 border-brand border-r-transparent" aria-hidden />
      {label}…
    </div>
  );
}

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={cx("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
        <rect width="32" height="32" rx="9" fill="#2563EB" />
        <path d="M21.5 11.2a7 7 0 1 0 0 9.6" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
        <circle cx="22.6" cy="16" r="2.4" fill="#14B8A6" />
      </svg>
      <span className={light ? "text-white" : "text-ink"}>
        Creators<span className="text-teal">AI</span>
      </span>
    </span>
  );
}
