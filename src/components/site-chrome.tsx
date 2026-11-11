import Link from "next/link";
import { site } from "@/lib/config";
import { LanguageSwitcher } from "./locale-provider";
import { ButtonLink, Logo } from "./ui";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-ink/95 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between">
        <Link href="/" aria-label={`${site.name} home`}>
          <Logo light />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-6 text-sm text-slate-300 lg:flex">
          <Link href="/creators" className="hover:text-white">For creators</Link>
          <Link href="/brands" className="hover:text-white">For brands</Link>
          <Link href="/tools" className="hover:text-white">Free tools</Link>
          <Link href="/guides" className="hover:text-white">Guides</Link>
          <Link href="/pricing" className="hover:text-white">Pricing</Link>
        </nav>
        <div className="flex items-center gap-2">
          <LanguageSwitcher dark />
          <Link href="/login" className="hidden rounded-xl px-3 py-2 text-sm font-medium text-slate-300 hover:text-white sm:inline-flex">
            Sign in
          </Link>
          <span data-magnetic className="inline-flex"><ButtonLink href="/join" className="!px-3.5 !py-2">Request invite</ButtonLink></span>
        </div>
      </div>
      <nav aria-label="Sections" className="border-t border-white/10 lg:hidden">
        <ul className="container-page flex gap-5 overflow-x-auto py-2.5 text-sm whitespace-nowrap text-slate-300 [scrollbar-width:none]">
          <li><Link href="/creators" className="hover:text-white">Creators</Link></li>
          <li><Link href="/brands" className="hover:text-white">Brands</Link></li>
          <li><Link href="/tools" className="hover:text-white">Free tools</Link></li>
          <li><Link href="/guides" className="hover:text-white">Guides</Link></li>
          <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
          <li><Link href="/why-switch" className="hover:text-white">Why switch</Link></li>
        </ul>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-line bg-white">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 md:grid-cols-5">
        <div className="space-y-3 md:col-span-2">
          <Logo />
          <p className="max-w-sm text-sm text-muted">{site.tagline} An invite-only network for creators, brands and local creative communities in India.</p>
        </div>
        <nav aria-label="Product" className="space-y-2 text-sm">
          <p className="font-semibold">Network</p>
          <ul className="space-y-2 text-muted">
            <li><Link href="/creators" className="hover:text-ink">For creators</Link></li>
            <li><Link href="/brands" className="hover:text-ink">For brands</Link></li>
            <li><Link href="/join?role=professional" className="hover:text-ink">Creative professionals</Link></li>
            <li><Link href="/why-switch" className="hover:text-ink">Why switch</Link></li>
            <li><Link href="/pricing" className="hover:text-ink">Pricing</Link></li>
            <li><Link href="/about" className="hover:text-ink">About &amp; founder</Link></li>
            <li><a href={site.xUrl} target="_blank" rel="noopener noreferrer me" className="hover:text-ink">Follow @{site.xHandle} on X</a></li>
            <li><Link href="/contact" className="hover:text-ink">Contact</Link></li>
          </ul>
        </nav>
        <nav aria-label="Resources" className="space-y-2 text-sm">
          <p className="font-semibold">Free resources</p>
          <ul className="space-y-2 text-muted">
            <li><Link href="/tools" className="hover:text-ink">All free tools</Link></li>
            <li><Link href="/tools/rate-calculator" className="hover:text-ink">Creator rate calculator</Link></li>
            <li><Link href="/tools/gst-invoice-generator" className="hover:text-ink">GST invoice generator</Link></li>
            <li><Link href="/tools/collab-agreement-generator" className="hover:text-ink">Collaboration agreement</Link></li>
            <li><Link href="/tools/ad-disclosure-checker" className="hover:text-ink">Ad disclosure checker</Link></li>
            <li><Link href="/guides" className="hover:text-ink">Guides</Link></li>
          </ul>
        </nav>
        <nav aria-label="Legal" className="space-y-2 text-sm">
          <p className="font-semibold">Legal</p>
          <ul className="space-y-2 text-muted">
            <li><Link href="/privacy" className="hover:text-ink">Privacy Policy</Link></li>
            <li><Link href="/terms" className="hover:text-ink">Terms of Service</Link></li>
            <li><Link href="/community-guidelines" className="hover:text-ink">Community Guidelines</Link></li>
            <li><Link href="/refund-policy" className="hover:text-ink">Refund Policy</Link></li>
            <li><Link href="/grievance" className="hover:text-ink">Grievance Redressal</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-muted sm:flex-row sm:justify-between">
          <p>© {year} {site.name}. Founded by {site.founder}. All rights reserved.</p>
          <p>
            Made in India · <a className="hover:text-ink" href={site.xUrl} target="_blank" rel="noopener noreferrer me">@{site.xHandle}</a> ·{" "}
            <a className="hover:text-ink" href={`mailto:${site.supportEmail}`}>{site.supportEmail}</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
