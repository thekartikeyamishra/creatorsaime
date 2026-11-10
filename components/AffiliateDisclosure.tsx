import { Info } from "lucide-react";
import { affiliateDisclosure } from "@/lib/site";

/** Compact, honest affiliate disclosure. Place near the top of monetized pages. */
export default function AffiliateDisclosure({
  className = "",
}: {
  className?: string;
}) {
  return (
    <p
      className={`flex items-start gap-2 rounded-lg border border-ink-700 bg-ink-800/40 px-3 py-2 text-xs text-bone-faint ${className}`}
    >
      <Info size={13} className="mt-0.5 shrink-0" aria-hidden />
      <span>{affiliateDisclosure}</span>
    </p>
  );
}
