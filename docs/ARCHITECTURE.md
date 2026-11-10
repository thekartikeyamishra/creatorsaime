# Architecture

## Principles
- **Server is the only writer.** Every mutation goes through a Next.js Route Handler that verifies the Firebase ID token (with revocation check), authorises, validates with Zod, rate-limits, writes in a Firestore transaction and appends an audit entry. Firestore rules deny all client writes.
- **Deterministic core, AI optional.** Nothing in Stage 1 depends on an AI provider. The onboarding preview is a pure function (`src/lib/readiness.ts`). AI arrives in Stage 4 behind a provider-adapter gateway with fallbacks.
- **No fabricated data.** No fake counts, logos, testimonials, events or scores anywhere in the UI.
- **One identity, one audit trail.** `users` + role profile + `auditLogs` are shared by every future module.

## Layout
```
src/
  app/
    (site)/        public pages (static), /join, /p/[handle] (dynamic, server-rendered)
    (app)/         auth flows, /dashboard/*, /admin/* (client, behind AuthProvider)
    api/           route handlers (nodejs runtime)
    sitemap.ts robots.ts manifest.ts opengraph-image.tsx icon.svg
  components/      UI primitives, forms, shells
  lib/
    config.ts      single source of truth: cities, categories, roles, policy version
    schemas.ts     all Zod input schemas (shared client/server)
    readiness.ts   deterministic previews + Creator Pod suggestion
    ids.ts         CSPRNG codes (referral, invite, verification, handles)
    firebase/      lazy client + admin SDK init
    server/        auth, http, rate-limit, audit, crypto, serialize, passport
    client/        api fetcher, auth context, types
tests/unit         Vitest  ·  tests/rules  Firestore emulator tests
```
A monorepo (`apps/`, `services/`, `packages/`) is deliberately deferred until a second deployable exists (browser extension / MCP server in Stage 5). The `lib/` boundaries map 1:1 to future packages (`schemas`, `config`, `types`, `provider-adapters`).

## Data model (Firestore)
| Collection | Key | Purpose | Client access |
|---|---|---|---|
| `waitlist` | HMAC(email) | invite requests, referral stats, status | none |
| `referralCodes` | code | code → waitlist id | none |
| `invites` | SHA-256(code) | single-use, email-bound, expiring | none |
| `users` | uid | role, handle, status, consent flag | read own |
| `creatorProfiles` / `brandProfiles` | uid | profile; server-owned `verifiedPlatforms` / `verified` | read own |
| `handles` | handle | uniqueness lock → uid | none |
| `socialAccounts` | auto | ownership verification workflow | none |
| `brandVerifications` | uid | business verification workflow | none |
| `trustSignals` | auto | evidence-backed facts feeding the Trust Passport | none |
| `consentRecords` | auto | append-only consent history (versioned) | none |
| `dataRequests` | auto | DPDP/GDPR requests | none |
| `auditLogs` | auto | append-only admin/user actions | none |
| `rateLimits` | hashed | fixed windows, TTL-deleted | none |

| `deals` | auto | collaborations: parties, deliverables, payments (ledger entries), terms hash, acceptance, completion, tracking | none |
| `dealLinks` | SHA-256(token) | private counterparty links (60-day TTL, latest only) | none |
| `trackingLinks` | 7-char code | tracked redirect → destination | none |
| `clickDedupe` | HMAC | one count per visitor/day (2-day TTL) | none |
| `campaigns` | auto | brand briefs (draft/open/closed) | none |
| `applications` | `{campaignId}_{uid}` | one per creator per campaign, creator snapshot | none |
| `billingProfiles` | uid | private invoice details, UPI ID, invoice counter | none |

Every document carries `schemaVersion`. Indexes are versioned in `firestore.indexes.json`.

## Key flows
1. **Join** → `POST /api/waitlist` → preview returned instantly; entry + referral code + 2 consent records + audit in one transaction.
2. **Approve** → `PATCH /api/admin/waitlist/:id` → invite hash stored, raw link shown once to the admin.
3. **Accept** → user signs up (email verified) → `POST /api/invite/redeem` → checks hash, status, expiry, email match → creates user, handle, profile atomically.
4. **Verify** → user adds account (gets `CAI-XXXXXX` code) → marks ready → admin checks bio → verified → profile badge + trust signal + audit.

5. **Deal Desk** → `POST /api/deals` (manual, any client) or accepted application → `PATCH /api/deals/:id` actions (terms, deliverables, payments, tracking, completion) in transactions; off-platform side acts via `POST /api/d/:token`. Both completions → `trustSignals` entry.
6. **Tracked link** → `GET /r/:code` → dedupe doc `create()` (fails silently on repeat) → `FieldValue.increment` → 302. Redirect never blocks on counting.

## Money handling
v0.2 **records** payments; it does not move money. Holding funds for others (escrow) needs a payment-aggregator setup (e.g. Razorpay Route) and legal review — planned once paid pilots validate demand. Monetisation now: managed-campaign service fee (agreed offline); next: brand Pro plan via Razorpay subscriptions.

## Roadmap fit
Stage 2 adds `campaigns`, `applications`, `collaborations`, `deliverables`, `transactions` (immutable ledger), `paymentEvents` (idempotent Razorpay webhooks) on the same identity, audit and authz primitives.
