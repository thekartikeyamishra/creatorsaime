import { toolUrl, toolRel, type Tool } from "@/lib/site";
import { ExternalLink } from "lucide-react";

// Outbound link to the generator. Uses the affiliate URL when configured,
// with a Google-compliant rel (sponsored for affiliate, nofollow otherwise).
export default function ToolBadge({
  tool,
  primary = false,
}: {
  tool: Tool;
  primary?: boolean;
}) {
  return (
    <a
      href={toolUrl(tool)}
      target="_blank"
      rel={toolRel(tool)}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors ${
        primary
          ? "border-coral/40 bg-coral/10 text-coral hover:bg-coral/20"
          : "border-ink-600 text-bone-dim hover:border-bone-faint hover:text-bone"
      }`}
    >
      {tool}
      {primary && <ExternalLink size={11} />}
    </a>
  );
}
