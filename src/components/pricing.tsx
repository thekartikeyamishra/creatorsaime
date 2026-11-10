import { formatPaise, PRODUCTS } from "@/lib/plans";

export const BRAND_FREE_FEATURES = [
  "Deal Desk — unlimited deals, reminders, agreements",
  "Tracked links + promo-code results",
  "1 open campaign brief at a time",
  "Applications from verified creators",
  "National Rate Index (median fees)",
];
export const BRAND_GROWTH_FEATURES = [
  "Everything in Free",
  "Up to 10 open briefs at once",
  "Featured placement — your briefs shown first to creators",
  "Full Rate & Results Index: city-level fee ranges + cost per customer",
  "Results export (CSV) for your team or accounts",
  "Priority support from the founder team",
];

export function priceLine(): { monthly: string; yearly: string; perMonthYearly: string; pilot: string } {
  return {
    monthly: formatPaise(PRODUCTS.growth_monthly.amountPaise),
    yearly: formatPaise(PRODUCTS.growth_yearly.amountPaise),
    perMonthYearly: formatPaise(Math.round(PRODUCTS.growth_yearly.amountPaise / 12 / 100) * 100),
    pilot: formatPaise(PRODUCTS.managed_pilot.amountPaise),
  };
}

export function Check({ children, dark }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <li className="flex gap-3">
      <svg viewBox="0 0 20 20" className="mt-0.5 size-5 shrink-0 text-teal" aria-hidden><path fill="currentColor" d="M8.1 13.6 4.5 10l-1.4 1.4 5 5 9-9-1.4-1.4z" /></svg>
      <span className={dark ? "text-slate-200" : ""}>{children}</span>
    </li>
  );
}
