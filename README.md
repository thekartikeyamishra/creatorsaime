# CreatorsAI — v0.7: हिंदी (Hindi)

Most target users in tier-2/3 cities run their business in Hindi. v0.7 adds Hindi where it matters most for switching:

| | What shipped |
|---|---|
| **Language switch** | EN / हिं toggle on the site and in the app (saved in a cookie and on the member's account). |
| **Hindi Deal Desk** | Deal list, deal page, deal form, payments, reminders, results and wrap-up in natural business Hindi (Devanagari with everyday English words). |
| **Hindi client page** | The private agreement page for off-platform clients auto-detects Hindi (or `?lang=hi`), and their WhatsApp opt-in remembers the language. |
| **Hindi WhatsApp** | One-tap reminders, nudges, instant alerts, daily summary and automatic payment reminders go out in the recipient's language (Hindi template texts in docs/WHATSAPP.md). |
| **Hindi landing** | `/hi` — a full Hindi landing page with hreflang links, in the sitemap. |
| **Hindi join form** | Invite request form in Hindi. |

Adding more languages: add a dictionary to `src/lib/i18n.ts` — a unit test fails if any key is missing.

# v0.6: WhatsApp-native

Traditional businesses live on WhatsApp. v0.6 meets them there — officially, through Meta's WhatsApp Cloud API with approved templates.

| | What shipped |
|---|---|
| **Member alerts** | Connect WhatsApp with a one-time code (versioned consent recorded). Instant alerts for new applications, hires, agreements via link and payments (max 10/day) plus the 9 AM summary. Toggle each, disconnect anytime, or reply STOP. |
| **Clients opt in on the deal link** | An off-platform client can tick "send me updates about this deal" on the private agreement page — explicit, per-deal consent. |
| **Automatic payment reminders** | Creators switch on auto-reminders for an opted-in client: once overdue, CreatorsAI sends a polite reminder from its verified business number with a one-tap button to the deal page — every 3 days, max 3. The creator is notified each time. |
| **Compliance by design** | Templates only (no spam), STOP / "band karo" handled by webhook (signature-verified), numbers masked in the UI, message log without contents, per-day caps. Setup + template texts: **docs/WHATSAPP.md**. |

# v0.5: Creator Pods

| | What shipped |
|---|---|
| **Pods** | Creators and professionals form verified teams (up to 8): roles, % shares, invites by handle, public pod pages (`/pods/:id`) and a directory brands can browse. |
| **Apply as a pod** | The lead submits one application for the team. Every active member must be ownership-verified and shares must total 100%, so brands get a fully verified team in one click. |
| **Pod deals** | Accepting creates one deal visible to all members. The lead assigns each deliverable to a member; members update their own work. A split ledger shows each member's share of the fee, what's due so far (based on what the brand has actually paid), what's been paid out and what's owed. Members confirm each payout they receive. |
| **Fair credit** | On two-sided completion every member gets a public trust signal, and on-time stats count only the deliverables they owned. Pod deals are excluded from per-unit rate benchmarks. |

# v0.4: Moats (Trust Graph + Rate & Results Index)

v0.4 turns everyday Deal Desk usage into data nobody else has. See **docs/MOATS.md**.

| | What shipped |
|---|---|
| **Trust Graph** | Two-sided reliability built only from deals **both parties confirmed**: creators' on-time delivery (from recorded delivery dates — never invented) and repeat clients; brands' paid-on-time record and rehires. Transparent counts with sample sizes, no opaque score. Shown on Trust Passports, on every application (for brands) and on every brief (for creators). |
| **Rate & Results Index** | Per-unit fee ranges (p25/median/p75) and median cost per customer by city × category × deliverable, from completed, paid, single-type deals. k-anonymity: 5+ deals from 3+ creators or nothing is shown. Free for creators; brands get national medians free and full city-level data + cost per customer on **Growth**. Inline "is this price fair?" hints on applications and briefs. |
| Nightly job | `/api/cron/insights` (08:00 IST) rebuilds both, before the 09:00 digest. |

# v0.3: Revenue & Retention

Live at **https://creatorsai.me** · built in public by Kartikeya Mishra — follow [@KartikeyahereX](https://x.com/KartikeyahereX)

## What's new in v0.13 — growth loops

- **Referrals** (Dashboard → Invite & earn): share link `/r/<code>`, brands joining get **14 days of Growth free**; referrers are rewarded only after a verified first payment or a both-sides-confirmed deal — brands earn Growth days, creators earn Ambassador status. No cash cost, capped, audit-logged. Every client deal link now carries the creator's invite.
- **Verified reviews:** only for deals both sides confirmed, double-blind for 14 days, shown on public profiles; reporting + Admin → Reviews moderation.
- **Recurring revenue:** trial status on the plan page; renewal reminders at 7 days, 1 day and on expiry (daily job).
- Privacy Policy and Terms updated (policy version 2026-11-12). Strategy & data model: `docs/GROWTH-LOOPS.md`. **Deploy the new Firestore indexes.**

## What's new in v0.12

- **Crash-proof backend:** Firestore uses HTTPS (`preferRest`) instead of gRPC streams on serverless; stray promise rejections are logged instead of crashing the instance (`src/instrumentation.ts`).
- **Forgiving credentials:** the service account may be base64 *or* raw JSON, with or without quotes; private keys with literal `\n` are repaired (tested).
- **`/api/ping`** (no dependencies) vs **`/api/health?deep=1`** (full diagnosis) pinpoint where a failure is.
- Errors from the hosting platform now show status + Vercel request id instead of `(error)`.

## What's new in v0.11

- **Self-diagnosis:** `/api/health?deep=1` checks Firebase config, admin key, Auth and Firestore and names the fix (no secrets).
- Firebase/Firestore failures now return **503 with a specific code** instead of an opaque 500; the app shows *Try again* / *Sign out* instead of a dead end.
- `create-test-user` explains setup errors (database missing, Auth not initialised, wrong key).

## What's new in v0.10

- **Free sign-up** for creators, brands and professionals (email + verification, or Google); invite links still work.
- **Clear sign-in errors**: Firebase setup problems now say exactly what to fix instead of "Something went wrong".
- **Test account script**: `npm run create-test-user -- test@creatorsai.me "<password>"` (and `--delete` before launch).
- Setup guide: `docs/AUTH-SETUP.md`.

## What's new in v0.9

- **5 free public tools** (`/tools`): creator rate calculator, GST invoice generator, collaboration agreement generator, ASCI ad-disclosure checker, engagement rate calculator — private (run in the browser), no sign-up, progress saved, each ending in a sign-up step.
- **6 sourced long-form guides** (`/guides`) with author, dates, sources and Article/FAQ/Breadcrumb schema.
- **Google AdSense, policy-first:** verification meta tag, `ads.txt`, ads only on tools and guides, lazy-loaded, labelled, no layout shift, kill switch. See `docs/ADSENSE.md`.
- **Micro-interactions:** cursor spotlight, magnetic buttons, tilt cards and scroll reveals — dependency-free, disabled on touch and for reduced motion.
- **SEO:** sitemap includes tools and guides, header/footer/mobile internal links, privacy policy ad-cookie disclosure. See `docs/SEO-PERFORMANCE.md`.
- **Legal & ownership summary:** `docs/LEGAL-OWNERSHIP.md`.

## What's new in v0.8

- **Admin → Setup check** (`/admin/setup`): every integration at a glance (Firebase, Razorpay, WhatsApp, email, cron, Node, MFA) plus read-only live connection tests. Never displays secret values.
- **Build hardening**: type-checks only CreatorsAI code, pre-build guard against leftover files from other projects, Node pinned to 22.x, `firebase-tools` removed from installs (≈2 min faster Vercel builds).

## v0.3 — making it pay, and making it a habit

| | What shipped |
|---|---|
| **Revenue** | Brand plans via **Razorpay**: Free (1 open brief) → **Growth** ₹1,499/mo or ₹14,990/yr (10 open briefs, featured placement, CSV export, priority support) → **Managed Pilot** ₹4,999 one-time. Creators stay free forever. |
| Payments design | Server-priced Razorpay **Orders** (client never sends an amount) → Checkout → HMAC-verified callback **and** signed webhook backstop → idempotent fulfilment in one Firestore transaction → sequential receipts `CAI-YYYY-NNNNNN`. Prepaid, **no auto-renewal** (no e-mandate friction, no surprise debits); purchases stack. |
| **Retention** | In-app **notification bell** for every important event (new application, shortlisted, hired, terms agreed — including off-platform clients via link —, deliverable delivered, payment recorded, completion). |
| Daily nudges | 09:00 IST **digest** (Vercel Cron → `/api/cron/daily`): overdue money, late deliverables, what's due this week — in-app, plus optional email via Resend. Users can switch emails off. |
| Founder view | Admin overview now shows revenue (30-day / all-time), active Growth brands and Managed Pilots waiting. |
| Site | `/pricing`, updated refund policy & terms, X profile (@KartikeyahereX) in footer, metadata and structured data; default domain creatorsai.me. |

# v0.2: Foundation + Deal Desk & Campaigns

**Create together. Grow together.** The invite-only Creator Growth Network for creators, brands and local communities.
Founder & owner: **Kartikeya Mishra**.

This is Stage 1 of the roadmap: the trust and supply foundation everything else (campaigns, pods, payments, events, AI) builds on.

## v0.2 — the "reason to switch"

Traditional creators and businesses already have a system (WhatsApp, phone, notebooks, UPI). They only switch if the new one **makes money, helps them achieve more, or is ~3× faster and dependable** — and it must be useful *before* the network is big. So v0.2 ships a single-player tool that plugs into how they already work:

| Trigger | Feature |
|---|---|
| Makes money | **Deal Desk**: every deal, what's owed, overdue flags; one-tap WhatsApp payment reminders with UPI ID; numbered invoices (print/PDF) |
| Proves value (businesses rebook / pay more) | **Results tracking**: tracked short links `/r/CODE` (unique human clicks; bots and link previews ignored) + promo-code redemption counter → cost per customer |
| Fewer disputes, dependable | **Two-sided agreements**: terms hashed; any edit requires a fresh OK. Off-platform clients agree via a private link `/d/TOKEN` — no account needed |
| Achieve more | **Verified track record**: deals confirmed complete by both sides become evidence on the Trust Passport |
| 3× faster | **Campaign briefs**: write once, share one link `/c/ID`; applications from verified creators in one list; accept → deal auto-created on both dashboards |
| Zero switching cost | Free, keep WhatsApp/UPI/cash, bring existing clients, export anytime. Public page: `/why-switch` |

Growth loop: every reminder, agreement link and brief a member sends introduces CreatorsAI to someone who isn't on it yet.

## What's included (Stage 1)

| Area | Delivered |
|---|---|
| Public site | Landing, For creators, For brands, About/founder, Contact, Join — fast, static, SEO-ready |
| Aha moment | Deterministic **Creator Opportunity Preview** / **Campaign Match Preview** (with suggested Creator Pod) in seconds — no fake scores, works with zero AI providers |
| Waitlist + referrals | Validated, rate-limited, honeypot-protected, deduped by keyed email hash; referral codes; "qualified" referrals counted only on approval |
| Invite-only access | Admin approves → single-use, email-bound, 14-day invite (only its SHA-256 is stored) |
| Auth | Firebase Auth (email+password with email verification, Google) |
| Profiles | Creator / creative-professional / brand profiles, unique handles, public opt-in |
| Trust Passport | Public `/p/{handle}` with evidence-backed verified badges only; no PII; indexed only when verified |
| Verification | Social ownership via bio code + human review; brand business verification + human review; trust signals recorded |
| Admin | Founder stats, waitlist review, verification queues, member suspend/reactivate (reasoned, token-revoking), data requests, audit log |
| Privacy (DPDP/GDPR) | Separate marketing consent with versioned consent records, withdraw anytime, data export, deletion/correction/grievance requests |
| Security | Server-side authz on every route, deny-all Firestore rules, append-only audit, Origin checks, CSP + HSTS + frame/sniff/referrer/permissions headers, body-size caps, input sanitisation, open-redirect guard |
| PWA | Manifest, icons, conservative service worker (never caches private/API data), offline page |
| SEO | Metadata, canonical, OG image, sitemap, robots, Organization/WebSite/ProfilePage JSON-LD |
| Legal pages | Privacy, Terms, Refund, Community Guidelines, Grievance Redressal |

## Quick start (Windows / PowerShell)

```powershell
npm install
Copy-Item .env.example .env.local   # then fill it in (see docs/DEPLOYMENT.md)
npm run dev                          # http://localhost:3000
```

Make yourself admin (after signing up once at /signup or /login with Google):

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\service-account.json"
npm run set-admin -- you@example.com
```

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` | TypeScript strict check |
| `npm test` | Unit tests (Vitest) |
| `npm run test:rules` | Firestore rules tests in the emulator (Java 11+) |
| `npm run verify` | typecheck + tests + production build |
| `npm run set-admin -- <email> [--revoke]` | Grant/revoke admin claim |
| `npm run icons` | Regenerate PNG icons from SVG |

## Docs

- `docs/ARCHITECTURE.md` — structure, data model, request flow, roadmap fit
- `docs/SECURITY.md` — threat model and controls
- `docs/DEPLOYMENT.md` — Firebase setup, env vars, hosting, go-live checklist
- `docs/OPERATIONS.md` — daily founder runbook (approvals, verification, data requests)

## Stack

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 4 · Firebase Auth + Firestore · firebase-admin · Zod 4 · Vitest. Node 22+.
