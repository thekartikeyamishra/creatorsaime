# Sign-up & login setup (fixes the identitytoolkit 400 errors)

## What the console errors mean

| Console line | Meaning |
|---|---|
| `A listener indicated an asynchronous response by returning true, but the message channel closed…` | A **browser extension** (password manager, ad blocker, translator). Not CreatorsAI. Safe to ignore; test in an incognito window to confirm. |
| `identitytoolkit.googleapis.com … 400` | Firebase rejected the sign-in. Since v0.10 the login screen shows the exact reason. Usual causes below. |
| `www.googleapis.com/identitytoolkit/v3/relyingparty/getProjectConfig … 400` | Firebase Authentication isn't initialised for the project, or the API key is restricted. |

## First: run the self-diagnosis

Open **https://creatorsai.me/api/health?deep=1**. Every check should say `"ok": true`. Any failing check names the problem and the fix (no secrets are shown):

| code | Fix |
|---|---|
| `admin_not_configured` | Add `FIREBASE_SERVICE_ACCOUNT_BASE64` in Vercel (Production) → redeploy |
| `admin_key_malformed` | Re-encode the key file: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("E:\keys\<file>.json")) \| Set-Clipboard` → paste → redeploy |
| `project_mismatch` | The key and `NEXT_PUBLIC_FIREBASE_PROJECT_ID` are from different Firebase projects |
| `firestore_database_missing` | Firebase console → **Firestore Database → Create database** (Native mode, asia-south1) |
| `firestore_api_disabled` | Create the database from the Firebase console (it enables the API) |
| `firestore_permission_denied` / `admin_credentials_rejected` | Generate a new private key in this project and update Vercel |
| `auth_admin_failed` | Firebase console → **Authentication → Get started** |

`/api/me` → **500** after Google sign-in means one of these server checks is failing (sign-in itself worked). Since v0.11 those return **503 with the code** shown on screen.

The console warning **"Cross-Origin-Opener-Policy policy would block the window.closed call"** is a harmless Chrome message printed during every Google sign-in popup.

## One-time Firebase setup (5 minutes)

1. **Firebase console → Authentication → Get started** (if you never clicked it, every sign-in returns 400).
2. **Sign-in method** → enable **Email/Password** and **Google** (set a support email for Google).
3. **Settings → Authorized domains** → add `creatorsai.me` and `www.creatorsai.me` (keep `localhost` for development).
4. **Google Cloud console → APIs & Services → Credentials →** your *Browser key (auto created by Firebase)*:
   - Application restrictions: *Websites* → `https://creatorsai.me/*`, `https://www.creatorsai.me/*`, `http://localhost:3000/*`
   - API restrictions: either *Don't restrict* or include **Identity Toolkit API** and **Token Service API**.
5. Check Vercel env vars `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID` match **Project settings → Your apps → Web app**. These are baked in at build time — **redeploy** after changing them.
6. Optional: **Authentication → Templates** → set the sender name to "CreatorsAI" for the verification email.

## The test account

The account must exist before you can sign in with it. Create it with the admin script (the password is typed by you, never stored in code):

```powershell
cd E:\creatorsai
$env:FIREBASE_SERVICE_ACCOUNT_BASE64 = "<paste the same value you have in Vercel>"
npm run create-test-user -- test@creatorsai.me "test@1234"
```

It creates a verified-email creator account (`isTest: true`) with a private profile. Sign in at https://creatorsai.me/login.

- Run it again any time to reset the password.
- Make it an admin too (optional): `npm run set-admin -- test@creatorsai.me`
- **Before public launch**, delete it — `test@1234` is a weak, shared password:
  `npm run create-test-user -- test@creatorsai.me --delete`

## How sign-up works now

- **Open sign-up** at `/signup`: choose Creator / Brand / Creative Professional, name, email, password (10+ characters), accept Terms. A verification email is sent; after clicking it, "I've verified — continue" creates the account. Google sign-up is instant (Google emails are verified).
- **Invite links** (`/signup?invite=…`) still work exactly as before.
- Anyone signed in without an account (e.g. clicked Google on the login page first) is sent to finish setup automatically.
- Abuse protection: verified email required, rate limits per IP (8/hour) and per user, server-side validation, consent records (DPDP).
