"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, BookOpen, Bookmark } from "lucide-react";

const items = [
  { href: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
  {
    href: "/category/cinematic-portraits/",
    label: "Browse",
    icon: LayoutGrid,
    match: (p: string) => p.startsWith("/category") || p.startsWith("/prompt"),
  },
  {
    href: "/saved/",
    label: "Saved",
    icon: Bookmark,
    match: (p: string) => p.startsWith("/saved"),
  },
  {
    href: "/guides/",
    label: "Guides",
    icon: BookOpen,
    match: (p: string) => p.startsWith("/guides"),
  },
];

/**
 * App-shell bottom navigation for mobile/PWA. Fixed, out of flow (no CLS),
 * honours iOS safe-area insets, and every target is ≥ 56px tall.
 */
export default function MobileNav() {
  const pathname = usePathname() || "/";
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-700/80 bg-ink/90 backdrop-blur-md md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {items.map((it) => {
          const active = it.match(pathname);
          const Icon = it.icon;
          return (
            <li key={it.href} className="flex-1">
              <Link
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[56px] flex-col items-center justify-center gap-0.5 py-2 text-[11px] transition-colors ${
                  active ? "text-coral" : "text-bone-faint hover:text-bone"
                }`}
              >
                <Icon size={20} aria-hidden />
                {it.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
