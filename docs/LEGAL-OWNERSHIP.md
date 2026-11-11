# Legal, financial & ownership summary — CreatorsAI

Owner: **Kartikeya Mishra** · Prepared November 2026 · This is a practical checklist, **not legal or tax advice**. Have a lawyer and a chartered accountant confirm the items marked ⚖️ before scaling.

## 1. Ownership of the code, brand and platform

| Asset | How ownership is secured | Action |
|---|---|---|
| Source code | Written for and delivered to Kartikeya Mishra; `package.json` is `UNLICENSED` (all rights reserved); footer states © CreatorsAI, founded by Kartikeya Mishra | Keep the Git history (dated commits) as evidence of authorship. Keep the repo private. |
| AI-assisted code | Copyright protection for purely AI-generated material is unsettled in India and abroad; human selection, arrangement, review and modification strengthen your claim | Keep your prompts, review notes and edits; you direct, select and modify all code ⚖️ |
| Contributors | Anyone else who writes code/content must assign IP to you (or your company) **in writing** before starting | Use an IP assignment + NDA for every freelancer or employee ⚖️ |
| Brand "CreatorsAI" | Trademark is separate from the company/domain | File a trademark application in India (likely classes 9, 35, 42 — confirm with an attorney) and run a clearance search first ⚖️ |
| Domain creatorsai.me | Registered to whoever holds the registrar account | Register in your own name/email, enable 2FA, auto-renew, registrar lock |
| Accounts | Vercel, Firebase/Google Cloud, Razorpay, Meta, Resend, AdSense, GitHub, X | Own every account personally (or via the company), 2FA everywhere, recovery codes stored offline |

## 2. Company structure (when revenue starts)

- **Sole proprietorship** is fine to start but you are personally liable.
- **One Person Company (OPC)** or **Private Limited** gives limited liability and makes IP ownership, investment and Razorpay/AdSense business payouts cleaner. When you incorporate, **assign the code, domain and trademark from you to the company** with a written deed ⚖️.
- Keep a separate bank account for all platform income.

## 3. Tax (India)

- **GST:** registration is mandatory once aggregate turnover from services crosses ₹20 lakh/year (₹10 lakh in special-category states). Subscription fees from Indian brands attract 18% GST once registered. Income from Google AdSense paid from abroad is generally treated as export of services (zero-rated with an LUT) ⚖️.
- **Income tax:** platform and AdSense income is business income. From 1 April 2026 the Income-tax Act, 2025 replaced the 1961 Act — expect new section and form numbers.
- **Foreign inward remittances:** keep the bank's remittance advice (FIRA/FIRC) for every AdSense payment.
- **Razorpay:** settlements go to the bank account registered with Razorpay; issue and keep a GST-compliant invoice for every paid order once registered.

## 4. Data protection & platform law

| Law | Status in the code | Your action |
|---|---|---|
| DPDP Act, 2023 + DPDP Rules, 2025 (India) | Consent records with policy version, data export, deletion requests, grievance page, minimal data collection | Keep the grievance officer email monitored; respond within the time limits stated in the policy |
| IT Act 2000 / IT Rules 2021 (intermediary) | Grievance Redressal page, Community Guidelines, takedown flow via admin | Name a grievance officer; act on complaints promptly |
| GDPR/UK GDPR (international visitors) | Privacy policy covers controller role; Google certified CMP for EEA/UK ad consent | Enable the AdSense "European regulations" message |
| Consumer protection / refunds | Refund Policy page; prepaid plans, no auto-debit | Keep refund decisions consistent with the policy |
| ASCI (advertising) | Agreements and tools promote correct disclosure | — |

## 5. Payments, fraud and money safety

- CreatorsAI **records** deals; it does not hold creators' or brands' money (no escrow). That keeps you outside payment-aggregator licensing. Do not start holding funds for others without a licensed partner such as Razorpay Route and legal review ⚖️.
- Payment state is only changed by verified Razorpay webhooks (HMAC-checked), never by the browser.
- Prices are fixed server-side; clients cannot change amounts.

## 6. Contracts users accept

Terms of Service, Privacy Policy, Community Guidelines and Refund Policy are live and versioned. Material changes → bump `POLICY_VERSION` in `src/lib/config.ts` and notify users.

## 7. Before raising money or selling the company

Clean cap table, IP assignments from everyone who contributed, trademark filed, accounts owned by the company, and all policies current. These are what investors and acquirers check first.
