import Link from "next/link";
import Logo from "@/components/Logo";
import { site } from "@/lib/site";
import { categories } from "@/lib/prompts";

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-ink-700/80 bg-ink-800/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <span className="flex items-center gap-2 font-display text-2xl text-bone">
            <Logo size={28} />
            Creators<span className="text-coral">AI</span>
          </span>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-bone-dim">
            {site.tagline} Every prompt here is written and tested by hand, then
            routed to the generator that renders it best.
          </p>
          {/* Author block = E-E-A-T trust signal */}
          <div className="mt-6 rounded-xl border border-ink-600/60 p-4">
            <p className="text-sm text-bone">{site.author.name}</p>
            <p className="text-xs text-bone-faint">{site.author.role}</p>
            <div className="mt-2 flex flex-wrap gap-3 text-xs">
              <a href={site.author.linkedin} className="text-coral hover:underline" rel="author noopener" target="_blank">LinkedIn</a>
              <a href={site.author.x} className="text-coral hover:underline" rel="me noopener" target="_blank">X</a>
              <a href={site.author.medium} className="text-coral hover:underline" rel="me noopener" target="_blank">Medium</a>
              <a href={`mailto:${site.author.email}`} className="text-coral hover:underline">Email</a>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xs uppercase tracking-[0.2em] text-bone-faint">Categories</h3>
          <ul className="mt-4 space-y-2 text-sm text-bone-dim">
            {categories.map((c) => (
              <li key={c.slug}>
                <Link href={`/category/${c.slug}/`} className="hover:text-bone">{c.name}</Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-xs uppercase tracking-[0.2em] text-bone-faint">Site</h3>
          <ul className="mt-4 space-y-2 text-sm text-bone-dim">
            <li><Link href="/guides/" className="hover:text-bone">Guides</Link></li>
            <li><Link href="/tags/" className="hover:text-bone">Browse by tag</Link></li>
            <li><Link href="/about/" className="hover:text-bone">About</Link></li>
            <li><Link href="/contact/" className="hover:text-bone">Contact</Link></li>
            <li><Link href="/pricing/" className="hover:text-bone">Credits &amp; pricing</Link></li>
          </ul>
          <h3 className="mt-8 text-xs uppercase tracking-[0.2em] text-bone-faint">Legal</h3>
          <ul className="mt-4 space-y-2 text-sm text-bone-dim">
            <li><Link href="/terms/" className="hover:text-bone">Terms of Service</Link></li>
            <li><Link href="/privacy/" className="hover:text-bone">Privacy Policy</Link></li>
            <li><Link href="/refunds/" className="hover:text-bone">Refund &amp; Cancellation</Link></li>
            <li><Link href="/shipping/" className="hover:text-bone">Delivery Policy</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink-700/60 py-5 text-center text-xs text-bone-faint">
        © {new Date().getFullYear()} {site.name}. Prompts are original and free to use.
      </div>
    </footer>
  );
}
