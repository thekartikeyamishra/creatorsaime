# WhatsApp Business setup (Meta Cloud API)

## 1. Account
1. Create a Meta Business account and verify the business (needed for higher sending limits and the green "verified" name later).
2. developers.facebook.com → create an app (type **Business**) → add **WhatsApp**. Add your business phone number and complete display-name approval ("CreatorsAI").
3. Create a **System User** with a permanent token that has `whatsapp_business_messaging` and `whatsapp_business_management`. Set:
   - `WHATSAPP_TOKEN` — the system user token
   - `WHATSAPP_PHONE_NUMBER_ID` — from WhatsApp → API Setup
   - `WHATSAPP_APP_SECRET` — App → Settings → Basic
   - `WHATSAPP_VERIFY_TOKEN` — any random string you choose
4. Webhook: WhatsApp → Configuration → Callback URL `https://creatorsai.me/api/whatsapp/webhook`, verify token = `WHATSAPP_VERIFY_TOKEN`. Subscribe to **messages**.

## 2. Templates to submit (WhatsApp Manager → Message templates)
Names must match (or override them with the `WA_TPL_*` env vars). Language: **English (en)**. You can add Hindi versions later and set `WA_TEMPLATE_LANG=hi`.

**`cai_otp`** — Category: **Authentication**. Use Meta's standard authentication template with a **Copy code** button. The code is sent as both the body parameter and the button parameter.

**`cai_new_activity`** — Category: **Utility**
- Body: `{{1}} {{2}}. Open CreatorsAI to see details.`
  - Example: `Spice Route Café` / `applied to "Weekend brunch launch"`
- Button: **Visit website**, dynamic URL `https://creatorsai.me/{{1}}`, example `dashboard/deals/abc123`

**`cai_daily_digest`** — Category: **Utility**
- Body: `Good morning {{1}}! Your CreatorsAI Deal Desk today: {{2}}`
  - Example: `Riya` / `₹6,000 overdue from 1 client — send a one-tap reminder.`
- Button: **Visit website**, static URL `https://creatorsai.me/dashboard/deals`

**`cai_payment_reminder`** — Category: **Utility** (sent only to clients who opted in on the deal link)
- Body: `Hi {{1}}, this is a reminder from {{2}} via CreatorsAI about "{{3}}". Balance due: ₹{{4}} (due {{5}}). Thank you! Reply STOP to stop updates about this deal.`
  - Example: `Spice Route Café` / `Riya Sharma` / `Diwali menu launch` / `6,000` / `2026-11-05`
- Button: **Visit website**, dynamic URL `https://creatorsai.me/d/{{1}}`, example `AbCdEf…` (the private deal link token)

## 2b. Hindi versions (same template names, language **Hindi (hi)**)
The app picks the language per recipient (member's language setting, or the language the client used on the deal link).

- **`cai_new_activity` (hi)** — Body: `{{1}} {{2}}। पूरी जानकारी के लिए CreatorsAI खोलें।` — example `Spice Route Café` / `ने "Weekend brunch launch" के लिए आवेदन किया` — same dynamic URL button.
- **`cai_daily_digest` (hi)** — Body: `नमस्ते {{1}}! आज आपका CreatorsAI Deal Desk: {{2}}` — same static URL button.
- **`cai_payment_reminder` (hi)** — Body: `नमस्ते {{1}} जी, {{2}} की तरफ़ से CreatorsAI द्वारा "{{3}}" के लिए याद दिलाना। बाकी रकम: ₹{{4}} (तारीख़ {{5}})। धन्यवाद! इस deal के updates बंद करने के लिए STOP लिखें।` — same dynamic URL button.
- **`cai_otp` (hi)** — Meta's standard authentication template in Hindi.

## 3. Costs and limits
- Meta charges per template message (utility and authentication are low-cost in India; check current rates in WhatsApp Manager → Pricing). Expect well under ₹1 per message.
- Built-in caps: member alerts ≤ 10/day, client reminders ≤ 3 per deal (every 3 days, only once overdue), OTP ≤ 5/hour.
- New numbers start at a low daily limit of unique recipients, which rises automatically with quality. Keep the quality rating high: never message without opt-in.

## 4. Rules we follow
- Opt-in before any message (members: OTP; clients: tick-box on their own deal link). Consent records are stored with the policy version.
- STOP / UNSUBSCRIBE / "band karo" → instant opt-out everywhere for that number.
- Service messages only; no marketing on WhatsApp.
