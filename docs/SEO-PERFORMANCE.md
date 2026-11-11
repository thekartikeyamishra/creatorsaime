# SEO & performance checklist (v0.9)

Status key: ✅ done in code · 🔧 one-time step for you · ➖ not applicable (handled by the platform), with the reason.

## SEO

| Item | Status | Notes |
|---|---|---|
| sitemap.xml | ✅ | `src/app/sitemap.ts` — pages, 5 tools, 6 guides, with `lastModified` |
| robots.txt | ✅ | Blocks only `/api`, `/dashboard`, `/admin`, `/login`, `/signup`, private deal links |
| No accidental noindex | ✅ | Public pages are `index, follow`; only private links are blocked via robots |
| Canonical tags | ✅ | Every public page sets its own canonical (verified on build) |
| Meta titles & descriptions | ✅ | Unique per page; tools and guides from the catalog |
| One H1 per page, logical H2/H3 | ✅ | Verified: 1 `<h1>` on each checked page |
| Alt text | ✅ | Decorative icons are `aria-hidden`; no content images without alt |
| Schema markup | ✅ | Organization (home), WebApplication + FAQPage (tools), Article (guides), BreadcrumbList, ItemList (hubs) |
| Internal links | ✅ | Header + mobile section bar, footer "Free resources", home tools strip, tool ↔ guide cross-links, "Keep reading" |
| Broken links | ✅ | All internal links are generated from the catalogs; static params are fixed (`dynamicParams = false`) |
| Clean URL slugs | ✅ | Lowercase, hyphenated, descriptive (e.g. `/guides/gst-tds-for-creators-india`) |
| OG image | ✅ | `src/app/opengraph-image.tsx` (generated 1200×630) |
| HTTPS enforced | ✅ | Vercel redirects HTTP→HTTPS; HSTS preload header + `upgrade-insecure-requests` |
| Mobile responsiveness | ✅ | Checked at 390 px and 1440 px: no horizontal overflow; mobile section bar added |
| Search Console verification | 🔧 | See below |
| Backlink strategy | 🔧 | See below |

### Verify Search Console (5 minutes)

1. https://search.google.com/search-console → **Add property** → **Domain** → `creatorsai.me`.
2. Copy the TXT record → add it at your domain registrar's DNS → **Verify**. This is the most robust method and covers www and all subdomains.
   - Alternative (URL-prefix property): set `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=<code>` in Vercel and redeploy. The meta tag is already wired.
3. **Sitemaps** → submit `https://creatorsai.me/sitemap.xml`.
4. **URL inspection** → request indexing for `/tools`, `/guides` and each tool page.

### Backlink strategy (earned, policy-safe)

Never buy links or use link networks; Google treats that as spam.

1. **Tool-led outreach:** the GST invoice generator, rate calculator and ASCI checker are genuinely linkable. Email creator-economy newsletters, CA/tax bloggers and "tools for creators" list posts; offer the tool, not a link request.
2. **Founder presence:** build in public on X (@KartikeyahereX), LinkedIn and Indie Hackers. Each "Shipped:" post links to the tool or guide.
3. **Communities:** answer real questions on Reddit (r/IndianCreators, r/IndiaBusiness), Quora and creator Discords/WhatsApp groups. Link only when it directly answers the question.
4. **Local press & colleges:** "Prayagraj/Lucknow creator economy" story angle for local news and college media clubs; offer free workshops using the tools.
5. **Partners:** co-marketing with CA firms (GST guide), co-working spaces and city creator chapters — they link to resources they recommend.
6. **Directories (quality only):** Product Hunt launch, BetaList, There's An AI For That (if relevant), Indian startup directories.
7. **Data stories:** once the Rate & Results Index has enough verified deals, publish an anonymised "What creators earn in tier-2 India" report. Original data earns the strongest links.

## Performance

| Item | Status | Notes |
|---|---|---|
| Compress images | ✅ | Next/Image with AVIF/WebP; the site uses SVG/CSS for graphics |
| Lazy loading | ✅ | Ads load only near the viewport; AdSense library `lazyOnload`; images lazy by default |
| Code splitting | ✅ | Per-route chunks; each tool is its own dynamic chunk with a skeleton |
| Cache API responses | ✅ | Static pages are pre-rendered (SSG); APIs are `no-store` by design (personal data) |
| CDN | ✅ | Vercel's global edge network serves every static page and asset |
| Minify JS/CSS | ✅ | Next.js production build (Turbopack) |
| Database indexes | ✅ | Composite indexes for the app's compound queries live in `firestore.indexes.json` (deploy with Firebase CLI) |
| Reduce re-renders | ✅ | Tools use `useMemo`/`useDeferredValue`; pointer effects use rAF and DOM styles, not React state |
| Debounce input handlers | ✅ | Tool autosave is debounced (400 ms); calculations are deferred |
| Paginate large lists | ✅ | Admin lists and dashboards use cursor pagination / limits |
| Remove unused dependencies | ✅ | `firebase-tools` removed from installs in v0.8; no UI libraries added |
| Defer non-critical scripts | ✅ | AdSense `lazyOnload`; no analytics scripts |
| Loading skeletons | ✅ | `ToolSkeleton`, `Spinner` in app pages |
| Compress API payloads | ✅ | `compress: true` (gzip/brotli via Vercel) |
| Cache expensive computed results | ✅ | Rate & Results Index is precomputed nightly by cron, not per request |
| N+1 queries | ✅ | Batched `getAll`/aggregate queries in server modules |
| Server-side caching | ✅ | Tools, guides and marketing pages are static HTML at the edge |
| Load balancer | ➖ | Vercel serverless functions scale automatically behind Vercel's own load balancing |
| DB connection pooling | ➖ | Firestore is accessed over HTTPS/gRPC by a reused `firebase-admin` client — there is no connection pool to manage |
| Lighthouse audit | 🔧 | Run `npx lighthouse https://creatorsai.me/tools/rate-calculator --view` after deploy, or PageSpeed Insights. Expect ads to cost a few points on ad pages; that's normal. |
