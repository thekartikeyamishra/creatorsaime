# Security

| Threat | Control |
|---|---|
| Direct DB tampering (role escalation, self-verify) | Firestore rules deny all client writes; server whitelists fields via Zod; server-owned fields never accepted |
| Account takeover / stale sessions | `verifyIdToken(token, checkRevoked=true)`; suspension revokes refresh tokens; status checked on every member request |
| Admin abuse / insider | Admin only via custom claim set by CLI script; optional `ADMIN_REQUIRE_MFA=true`; every admin action audited (append-only, no client access) |
| Invite theft / brute force | 256-bit codes, only SHA-256 stored, bound to email, single-use, 14-day expiry, per-user rate limit |
| Spam / bots on waitlist | Honeypot (silent), per-IP fixed-window rate limit (HMAC'd IP), email dedupe, Origin check, 20 KB body cap |
| CSRF | Bearer tokens (no ambient cookies) + Origin check on every mutating route |
| XSS | React escaping; JSON-LD `<` escaped; CSP; only http(s) URLs accepted; user links `rel="nofollow ugc noopener"` |
| Clickjacking | `X-Frame-Options: DENY`, `frame-ancestors 'none'` |
| Open redirect | `safeNext()` only allows same-site relative paths |
| Data leakage on public pages | Passport loader reads a whitelisted public shape; email/phone/docs/codes never loaded |
| Enumeration | Uniform 404 for not-found vs not-owned; password reset never reveals account existence |
| Error leakage | Uniform error envelope; stack traces only in server logs |
| Denial-of-wallet | All list queries bounded (`limit`); no AI calls in Stage 1 |

## Known trade-offs / next steps
- **CSP uses `'unsafe-inline'` for scripts** so pages stay static and CDN-cacheable. Upgrade path: nonce-based CSP via `src/proxy.ts` (see Next docs `content-security-policy.md`) once pages are dynamic anyway.
- Rate limiting is Firestore-based (fine at this scale). Add Cloud Armor / Vercel Firewall rules for volumetric attacks.
- Enable **Firebase App Check** (reCAPTCHA Enterprise) for the web app before public launch.
- Enable **MFA (TOTP)** in Firebase Auth for admin accounts and set `ADMIN_REQUIRE_MFA=true`.
- File uploads are disabled (storage rules deny all) until signed-URL + malware scanning lands in Stage 2.
- Turn on Firestore **PITR + scheduled exports** and test a restore.

## Third-party scripts (v0.9)

- The only third-party script on public pages is Google AdSense, and only on `/tools/*` and `/guides/*`. It never loads on `/dashboard`, `/admin`, sign-in, checkout or deal pages (`isAdEligiblePath`, unit-tested).
- Any script on our origin can technically read same-origin browser storage. Mitigations: ads never run on authenticated screens; every sensitive action is authorised server-side with ID-token **revocation checks**; admin MFA is supported (`ADMIN_REQUIRE_MFA`); sessions can be revoked.
- `NEXT_PUBLIC_ADS_ENABLED=false` removes the ad script everywhere at the next deploy.
- Free tools are pure client-side functions: no network calls and no AI provider, so they keep working if any vendor is down, and they cannot be abused to run up our costs.
