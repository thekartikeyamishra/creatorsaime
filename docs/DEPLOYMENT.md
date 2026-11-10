# Deployment

## 1. Firebase project (use separate dev / staging / prod projects)
1. Create project → **Build → Authentication**: enable *Email/Password* and *Google*. Add your domain under *Authorized domains*.
2. **Firestore**: create in `asia-south1` (Mumbai) — production mode.
3. **Project settings → Your apps → Web app** → copy config into `NEXT_PUBLIC_FIREBASE_*`.
4. **Service account** (Project settings → Service accounts → Generate key). Never commit it.
5. Deploy rules + indexes + TTL policy:
   ```powershell
   npm i -g firebase-tools
   firebase login
   Copy-Item .firebaserc.example .firebaserc   # set your project ids
   firebase deploy --only firestore,storage
   ```
   The `rateLimits.expiresAt` TTL override in `firestore.indexes.json` enables automatic cleanup.

## 2. Environment variables
See `.env.example`. Required in production: `NEXT_PUBLIC_SITE_URL`, all `NEXT_PUBLIC_FIREBASE_*`, `HASH_SALT` (32+ random chars, never change it after launch — it keys email dedupe), admin credentials (`FIREBASE_SERVICE_ACCOUNT_BASE64` or ADC), `NEXT_PUBLIC_SUPPORT_EMAIL`, `NEXT_PUBLIC_GRIEVANCE_EMAIL`. Optional: `ADMIN_REQUIRE_MFA=true`, `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`.

## 3. Hosting
**Vercel** (simplest): import repo → set env vars (service account as base64) → deploy. Region `bom1`.
**Firebase App Hosting / Cloud Run**: uses Application Default Credentials automatically; set the remaining env vars as secrets.

## 4. Payments (Razorpay)
1. Razorpay Dashboard → **API Keys** → generate (start with **Test mode**). Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` (server-side secrets only).
2. **Webhooks** → add `https://creatorsai.me/api/plans/webhook`, events **order.paid** and **payment.captured**, set a secret → `RAZORPAY_WEBHOOK_SECRET`.
3. Test: buy Growth in test mode with a test card/UPI (`success@razorpay`). Check `/dashboard/plan` shows Growth, a receipt exists, and the admin overview shows revenue.
4. Go live: switch keys to live mode, re-create the webhook in live mode, update the three env vars.
5. Prices live in `src/lib/plans.ts` (paise). If you register for GST, add tax lines to the receipt before charging GST.

## 5. Notifications & daily digest
- Set `CRON_SECRET` (random 32+ chars). `vercel.json` schedules `/api/cron/daily` at 03:30 UTC (09:00 IST); Vercel sends the secret automatically. Elsewhere, call it with `Authorization: Bearer $CRON_SECRET` (e.g. Cloud Scheduler).
- Optional email: create a Resend account, verify the `creatorsai.me` domain (SPF/DKIM), set `RESEND_API_KEY` and `EMAIL_FROM`.
- Deploy the new indexes: `firebase deploy --only firestore:indexes`.

## 6. Go-live checklist
- [ ] `npm run verify` passes; `npm run test:rules` passes against the emulator
- [ ] Rules and indexes deployed; TTL policy active
- [ ] Admin claim set (`npm run set-admin -- you@…`), admin MFA enabled
- [ ] Support + grievance mailboxes exist and are monitored
- [ ] Legal pages reviewed by an Indian lawyer (entity name, jurisdiction, retention periods)
- [ ] App Check enabled; Search Console + Bing Webmaster verified; sitemap submitted
- [ ] Uptime monitor on `/api/health`; Firestore PITR/backups on
- [ ] Firebase Auth email templates branded (sender name "CreatorsAI")
