import Link from "next/link";
import { Bookmark } from "lucide-react";
import Logo from "@/components/Logo";
import { categories } from "@/lib/prompts";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-700/80 bg-ink/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Link href="/" className="group flex items-center gap-2">
          <Logo
            size={26}
            className="transition-transform group-hover:scale-110"
          />
          <span className="font-display text-xl tracking-tight text-bone">
            Creators<span className="text-coral">AI</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-bone-dim md:flex">
          {categories.slice(0, 4).map((c) => (
            <Link
              key={c.slug}
              href={`/category/${c.slug}/`}
              className="transition-colors hover:text-bone"
            >
              {c.name}
            </Link>
          ))}
          <Link
            href="/guides/"
            className="transition-colors hover:text-bone"
          >
            Guides
          </Link>
          <Link
            href="/saved/"
            className="inline-flex items-center gap-1 transition-colors hover:text-bone"
          >
            <Bookmark size={14} aria-hidden /> Saved
          </Link>
        </nav>

        <Link
          href="/#explore"
          className="rounded-full bg-bone px-4 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-coral hover:text-ink"
        >
          Browse prompts
        </Link>
      </div>
    </header>
  );
}
