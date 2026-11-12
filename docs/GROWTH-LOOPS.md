# Growth loops: referrals, recurring revenue, reviews (v0.13)

Built for a zero-budget launch: **no reward costs cash, every reward needs a verified real-world event, and each loop strengthens the moats.**

## 1. Referrals

| | Rule |
|---|---|
| Share link | `creatorsai.me/r/<code>` (Dashboard → **Invite & earn**). One-tap WhatsApp / X / email share. |
| Attribution | First-party **httpOnly** cookie for 30 days, read only by the sign-up API, cleared after use. Works for open sign-up and invite links. |
| Referred brand | **14 days of Growth free** on joining (once per account, no card, never auto-charged). |
| Qualifies when | Brand → **first paid order** (Razorpay-verified). Creator/professional → **first deal confirmed by both sides**. |
| Referrer reward | Brand referrer: **+30 Growth days** (brand) / **+15** (creator), stacked on the current plan. Creators & professionals: **Ambassador status** on their public profile — Ambassador (1), Community Builder (3), Founding Ambassador (10). |
| Limits | 12 rewards per referrer per year; no cash value; self-referral ignored; one referral record per person (document id = referred uid). |
| Timing | Instant after payment (best-effort, outside the payment transaction so it can never break checkout) + daily backstop job. Both idempotent. |

**Built-in viral loop:** every private deal link a creator sends now carries their referral link. When the client joins from it, the creator is credited and the brand starts its trial. Creators already send these links, so this growth costs nothing.

### Fraud & abuse defences
- Rewards only follow **verified** events (a captured payment, or a deal both sides confirmed). Fake sign-ups earn nothing.
- Rewards are platform value with no cash-out, capped yearly. Faking them would cost more than they're worth.
- Verified email required to sign up; per-IP and per-user rate limits.
- All decisions are audit-logged (`referral.qualified` with the reason).

### Unit economics
- Growth days cost almost nothing to serve (static pages, Firestore reads). A 30-day reward against a ₹1,499 first payment has an acquisition cost near ₹0.
- The 14-day trial is the conversion engine for recurring revenue: brands experience featured briefs and city-level insights, then get reminders (below).

### Phase 2 (only once revenue exists — still no upfront funds)
Pay creators a **revenue share from money already collected** (e.g. 10% of a referred brand's first-year payments) as payouts. This needs KYC, TDS on commission and a payout flow, so it's deliberately not in v0.13.

## 2. Recurring revenue (prepaid, no auto-debit)
- **Trial → paid:** referred brands start on a 14-day Growth trial; the plan page shows "Growth · free trial".
- **Renewal reminders:** in-app at 7 days, 1 day and on the end day (and by email for the last two, when Resend is configured). Deterministic ids mean re-runs never double-send. Copy pushes the yearly plan (2 months free).
- Renewals **stack** on remaining days, so renewing early never loses time.
- Why not auto-debit yet: UPI Autopay / card mandates add failure handling, mandate management and support cost. Revisit when more than ~100 paying brands justify it (Razorpay Subscriptions).

## 3. Verified reviews
- Possible **only** for deals both sides confirmed — one review per side per deal.
- **Double-blind:** hidden until both sides review or 14 days pass — no retaliation, more honest reviews, and a nudge to review back.
- Off-platform clients review creators from their private deal link (labelled "client via private deal link"), then see an invite to join.
- No links, emails or phone numbers (spam and poaching protection); max 3 preset tags + 280 characters.
- Reviewed members can **report**; admins hide or restore in **Admin → Reviews**. Negative-but-honest reviews stay.
- Shown on public profiles with average rating, top tags and the "each from a deal both sides confirmed" proof line.

## The moats these create
1. **Verified reputation graph:** reviews, track record and referrals are tied to confirmed deals and payments. Competitors and AI can copy features, not years of verified history.
2. **Platform-bound rewards:** Growth days and Ambassador status only have value here, which raises switching costs.
3. **Two-sided network loop:** creators bring their clients via deal links; brands bring creators via briefs. Each new member makes the network more valuable for both sides.

## Data model
| Collection | Doc id | Purpose |
|---|---|---|
| `memberRefCodes` | code | → `{ uid }` |
| `referrals` | referred uid | `{ referrerUid, status: joined/qualified, event, rewarded, trialDays }` |
| `referralStats` | referrer uid | `{ joined, qualified, ambassadorLevel, rewardsThisYear, growthDaysEarned }` |
| `reviews` | `<dealId>_<side>` | `{ subjectUid, rating, tags, text, revealAt, hidden, reported }` |

Deploy the new indexes: `npx -y firebase-tools@15 deploy --only firestore:indexes`.
