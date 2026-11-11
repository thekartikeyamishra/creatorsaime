# Google AdSense — setup, policy safety and the $3,500/month plan

Publisher: `ca-pub-4557897331416844` · Owner: Kartikeya Mishra

## 1. What is already built (v0.9)

| Requirement | Where |
|---|---|
| Site-verification meta tag `google-adsense-account` on every page | `src/app/layout.tsx` (`metadata.other`) |
| `ads.txt` at https://creatorsai.me/ads.txt | `public/ads.txt` |
| AdSense script — **only** on `/tools/*` and `/guides/*`, loaded after the page is idle | `src/components/ads.tsx` → `AdSenseScript` |
| Ad units with reserved space (no layout shift), "Advertisement" label, lazy (only near viewport), collapse when unfilled | `AdSlot` |
| Max 3 units per page, never next to buttons/forms, never in the app, sign-in, checkout, pricing, deal or profile pages | `src/lib/ads.ts` (`isAdEligiblePath`) — unit-tested |
| CSP allows Google ad + consent domains | `next.config.ts` |
| Privacy policy discloses Google advertising cookies + opt-out links | `/privacy` §5 |
| Kill switch | `NEXT_PUBLIC_ADS_ENABLED=false` → redeploy |
| Admin status | `/admin/setup` → "Google AdSense" |

**Why ads are not on the whole site:** CreatorsAI's core product is a trust network that brands pay for. Ads inside the app would cheapen it, leak attention to competitors and violate AdSense rules for screens without publisher content (logins, dashboards, forms). Ads go where people come to *read and use free content* — exactly where Google wants them.

## 2. Getting approved (the "Low-value content" rejection)

Google rejects sites that look thin, templated or unfinished. v0.9 addresses each point in that notice:

| Google asks for | What CreatorsAI now has |
|---|---|
| Authentic, high-quality information, tools or services | 5 working tools solving real Indian creator problems (rates, GST invoices, agreements, ASCI disclosure, engagement) + 6 sourced long-form guides, each linking to official sources |
| Ongoing curation and structural maintenance | Every page shows author and "last reviewed" date; sitemap with `lastModified`; clear nav, breadcrumbs, internal links |
| Genuine user interest | Tools are shareable, private, no sign-up; returning visitors resume where they left off |

**Before you click "Request review":**
1. Deploy v0.9 and confirm https://creatorsai.me/ads.txt shows the line exactly.
2. Open the site in an incognito window: no broken links, no "coming soon" pages, legal pages present (Privacy, Terms, Contact, About — all exist).
3. In AdSense → **Privacy & messaging** → create the **European regulations** message (Google's certified CMP). Required for EEA/UK/Switzerland traffic. No code change needed — the CSP already allows it.
4. Verify the site in **Google Search Console** (see `docs/SEO-PERFORMANCE.md`), submit `sitemap.xml`, and wait until the tools and guides show as **Indexed**.
5. Get some real traffic first. Share the tools in creator communities and on X (@KartikeyahereX). A site with zero visitors often gets "low value" even when content is good. 2–4 weeks of steady visits before requesting review is a sensible rule of thumb.
6. Publish more guides over those weeks (1–2 per week). Fresh, useful content signals "ongoing curation".

> No one can guarantee approval or a timeline — Google reviews manually and does not publish its exact thresholds. These steps remove every *known* reason for rejection.

## 3. After approval: create the three ad units

AdSense → **Ads → By ad unit**:

| Unit type | Env var | Placement |
|---|---|---|
| Display ad (responsive) | `NEXT_PUBLIC_ADSENSE_SLOT_TOOL` | After the first explainer section under each tool |
| In-article ad | `NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE` | After the 2nd section of guides with 4+ sections |
| Multiplex ad | `NEXT_PUBLIC_ADSENSE_SLOT_MULTIPLEX` | End of guides and hub pages |

Paste the numeric IDs into Vercel env vars → redeploy → `/admin/setup` shows "3/3 configured".

**Keep Auto ads OFF** (or allow only in-page, never anchor/vignette). Anchor and full-screen vignette ads are the main cause of "annoying" experiences and hurt Core Web Vitals and conversions to CreatorsAI sign-up.

## 4. Policy rules to never break

- Never click your own ads or ask anyone to click ("support us by clicking ads" is a violation).
- Never place ads on pages with no content, error pages, or behind login (enforced in code).
- Never label ads as anything other than "Advertisement" / "Sponsored links".
- Never buy cheap traffic (bots, pop-unders, traffic exchanges). It gets accounts banned.
- Don't copy content. Every guide must stay original; update rather than duplicate.
- Keep YMYL topics (tax, money) accurate, sourced and dated — already done in guides.

## 5. The $3,500/month goal — honest maths

AdSense earnings ≈ **page views × page RPM ÷ 1,000**. Page RPM is what you earn per 1,000 page views and depends mostly on **who** visits and **what topic** they read.

| Traffic mix (illustrative assumption) | Page RPM (assumption) | Monthly page views needed for $3,500 |
|---|---|---|
| Mostly India, general creator topics | ~$1–2 | ~1.75M–3.5M |
| India + money/tax topics (higher-value advertisers) | ~$2–4 | ~0.9M–1.75M |
| 40%+ US/UK/CA/AU visitors, business/finance topics | ~$8–15 | ~230k–440k |

These RPMs are rough planning assumptions; your real figure appears in AdSense after a few weeks and is the number to plan with.

**What this means:** $3,500/month from ads alone needs hundreds of thousands to millions of page views. That's achievable over 6–18 months of consistent publishing, but it is a traffic business. For comparison, $3,500 ≈ roughly ₹3 lakh/month, which is about **200 brands on Growth (₹1,499/month)** — far fewer people than the ad route needs. Treat ads as the engine that turns free-tool traffic into money, and the tools as the funnel into paid CreatorsAI plans.

## 6. The improvement loop (the "learning system")

Do this every month. It takes about an hour:

1. **AdSense → Reports → Pages:** find the pages with the highest page RPM.
2. **AdSense → Reports → Countries:** see where high-RPM traffic comes from.
3. **Search Console → Performance:** find queries where you rank 5–20 (page 1–2) — those are the fastest wins.
4. **Write or expand** guides for those high-RPM, rank-5-to-20 topics. Add a tool section if one fits.
5. **Promote** each new piece once on X and in two creator communities.
6. **Check `/admin/setup`** and Core Web Vitals in Search Console — slow pages earn less.

Topics likely to attract higher-value advertisers (to validate with your own reports): GST and tax for creators, business banking and payments, invoicing and accounting software, freelancing contracts, international clients and export of services, creator equipment, marketing for small businesses.

## 7. AdSense income and tax (India)

AdSense pays Indian publishers from abroad. Keep the foreign inward remittance advice from your bank for each payment. GST: payments from Google are commonly treated as export of services (zero-rated with a filed LUT) once you are GST-registered. Income tax: business income. Confirm both with your chartered accountant.
