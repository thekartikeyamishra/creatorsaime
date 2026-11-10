import Link from "next/link";
import CopyButton from "./CopyButton";
import ToolBadge from "./ToolBadge";
import SaveButton from "./SaveButton";
import PromptThumb from "./PromptThumb";
import { getCategory, type Prompt } from "@/lib/prompts";

// Deterministic hash → stable, varied values per card (SSR-safe, no layout shift).
function hash(id: string, salt: number) {
  let h = salt >>> 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

/** Procedural gradient shown when a prompt has no preview image (or it fails to load). */
export function proceduralArt(prompt: Prompt): string {
  const cat = getCategory(prompt.category);
  const [c1, c2] = cat?.palette ?? ["#211b18", "#ff5436"];
  const a = hash(prompt.id, 7) % 360;
  const px = 15 + (hash(prompt.id, 11) % 70);
  const py = 8 + (hash(prompt.id, 17) % 44);
  const qx = 20 + (hash(prompt.id, 23) % 60);
  const qy = 45 + (hash(prompt.id, 29) % 45);
  return `radial-gradient(85% 65% at ${px}% ${py}%, ${c2}d9, transparent 58%), radial-gradient(70% 60% at ${qx}% ${qy}%, ${c1}b3, transparent 62%), radial-gradient(140% 100% at 50% 130%, #0c0a09, transparent 65%), linear-gradient(${a}deg, ${c1}, ${c2})`;
}

export default function PromptCard({
  prompt,
  priority = false,
}: {
  prompt: Prompt;
  priority?: boolean;
}) {
  const cat = getCategory(prompt.category);

  return (
    <article className="animate-in group relative mb-5 break-inside-avoid overflow-hidden rounded-2xl border border-ink-700 bg-ink-800/60 transition-all duration-300 hover:border-ink-600 hover:shadow-[0_8px_40px_-12px_rgba(255,84,54,0.25)]">
      <SaveButton id={prompt.id} className="absolute right-3 top-3 z-10" />

      <Link href={`/prompt/${prompt.id}/`} className="relative block">
        <PromptThumb
          src={prompt.image}
          alt={`Example image for the prompt: ${prompt.title}`}
          gradient={proceduralArt(prompt)}
          priority={priority}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/90 to-transparent p-4">
          <span className="text-[11px] uppercase tracking-[0.2em] text-bone/70">
            {cat?.name}
          </span>
          <h3 className="font-display text-lg leading-tight text-bone">
            {prompt.title}
          </h3>
        </div>
      </Link>

      <div className="space-y-3 p-4">
        <p className="line-clamp-3 font-mono text-xs leading-relaxed text-bone-dim">
          {prompt.prompt}
        </p>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] uppercase tracking-wider text-bone-faint">
            Best in
          </span>
          <ToolBadge tool={prompt.bestTool} primary />
        </div>

        <div className="flex items-center justify-between pt-1">
          <CopyButton text={prompt.prompt} />
          <Link
            href={`/prompt/${prompt.id}/`}
            className="text-xs text-bone-faint underline-offset-4 hover:text-bone hover:underline"
          >
            Details →
          </Link>
        </div>
      </div>
    </article>
  );
}
