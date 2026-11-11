/**
 * Deployment setup check — pure, testable, and never returns secret values.
 *
 * Each item reports only: ok | missing | invalid | warn, plus a fix hint.
 * Used by the admin "Setup check" page so the founder can see at a glance which
 * integration (Firebase, Razorpay, WhatsApp, email, cron) is wired correctly.
 */

export type CheckStatus = "ok" | "missing" | "invalid" | "warn" | "off";

export type CheckItem = {
  key: string;
  label: string;
  status: CheckStatus;
  required: boolean;
  hint?: string;
};

export type CheckGroup = {
  id: "core" | "firebase" | "payments" | "whatsapp" | "email" | "cron" | "ads" | "runtime";
  title: string;
  /** What breaks for users if this group is not ready. */
  impact: string;
  items: CheckItem[];
};

export type SetupReport = {
  groups: CheckGroup[];
  summary: { ok: number; problems: number; warnings: number; ready: boolean };
};

type Env = Record<string, string | undefined>;

const has = (v: string | undefined): v is string => typeof v === "string" && v.trim().length > 0;

function secret(env: Env, key: string, label: string, opts: { required: boolean; min?: number; hint: string }): CheckItem {
  const v = env[key];
  if (!has(v)) return { key, label, required: opts.required, status: opts.required ? "missing" : "off", hint: opts.hint };
  if (opts.min && v.trim().length < opts.min) {
    return { key, label, required: opts.required, status: "invalid", hint: `Too short — use at least ${opts.min} random characters.` };
  }
  return { key, label, required: opts.required, status: "ok" };
}

function finalize(groups: CheckGroup[]): SetupReport {
  let ok = 0, problems = 0, warnings = 0;
  for (const g of groups)
    for (const i of g.items) {
      if (i.status === "ok") ok++;
      else if (i.status === "missing" || i.status === "invalid") problems++;
      else if (i.status === "warn") warnings++;
    }
  return { groups, summary: { ok, problems, warnings, ready: problems === 0 } };
}

export function setupReport(env: Env, nodeVersion = "22.0.0"): SetupReport {
  const prod = env.NODE_ENV === "production" || env.VERCEL_ENV === "production";

  // ── Core site ─────────────────────────────────────────────
  const siteUrl = env.NEXT_PUBLIC_SITE_URL;
  const core: CheckItem[] = [
    !has(siteUrl)
      ? { key: "NEXT_PUBLIC_SITE_URL", label: "Site URL", required: true, status: "missing", hint: "Set to https://creatorsai.me" }
      : !/^https:\/\/[^/]+$/.test(siteUrl.replace(/\/$/, "")) && prod
        ? { key: "NEXT_PUBLIC_SITE_URL", label: "Site URL", required: true, status: "invalid", hint: "Use the bare https origin, e.g. https://creatorsai.me (no path)." }
        : { key: "NEXT_PUBLIC_SITE_URL", label: "Site URL", required: true, status: "ok" },
    secret(env, "HASH_SALT", "Hash salt", { required: true, min: 32, hint: "32+ random characters. Never change it after launch." }),
    secret(env, "NEXT_PUBLIC_SUPPORT_EMAIL", "Support email", { required: true, hint: "e.g. hello@creatorsai.me" }),
    secret(env, "NEXT_PUBLIC_GRIEVANCE_EMAIL", "Grievance officer email", { required: true, hint: "Required by the IT Rules / DPDP Act." }),
  ];

  // ── Firebase ──────────────────────────────────────────────
  const fbPublic = ["API_KEY", "AUTH_DOMAIN", "PROJECT_ID", "APP_ID"].map((k) =>
    secret(env, `NEXT_PUBLIC_FIREBASE_${k}`, `Firebase ${k.toLowerCase().replace("_", " ")}`, {
      required: true,
      hint: "Firebase console → Project settings → Your apps → Web app config.",
    }),
  );
  const sa = env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  let saItem: CheckItem;
  if (!has(sa) && !has(env.GOOGLE_APPLICATION_CREDENTIALS)) {
    saItem = { key: "FIREBASE_SERVICE_ACCOUNT_BASE64", label: "Admin service account", required: true, status: "missing", hint: "Base64 of the service-account JSON (Project settings → Service accounts → Generate key)." };
  } else if (has(sa)) {
    let valid = false;
    try {
      const parsed = JSON.parse(Buffer.from(sa.trim(), "base64").toString("utf8")) as Record<string, unknown>;
      valid = typeof parsed.private_key === "string" && typeof parsed.client_email === "string";
      if (valid && has(env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) && parsed.project_id !== env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
        saItem = { key: "FIREBASE_SERVICE_ACCOUNT_BASE64", label: "Admin service account", required: true, status: "invalid", hint: "Service account belongs to a different Firebase project than NEXT_PUBLIC_FIREBASE_PROJECT_ID." };
        valid = false;
      }
    } catch {
      valid = false;
    }
    saItem ??= valid
      ? { key: "FIREBASE_SERVICE_ACCOUNT_BASE64", label: "Admin service account", required: true, status: "ok" }
      : { key: "FIREBASE_SERVICE_ACCOUNT_BASE64", label: "Admin service account", required: true, status: "invalid", hint: "Not valid base64 of a service-account JSON. Re-encode the whole file on one line." };
  } else {
    saItem = { key: "GOOGLE_APPLICATION_CREDENTIALS", label: "Admin credentials (ADC)", required: true, status: "ok" };
  }

  // ── Payments ──────────────────────────────────────────────
  const keyId = env.RAZORPAY_KEY_ID;
  const payItems: CheckItem[] = [];
  if (!has(keyId)) payItems.push({ key: "RAZORPAY_KEY_ID", label: "Razorpay key ID", required: true, status: "missing", hint: "Razorpay → Account & Settings → API keys." });
  else if (!/^rzp_(live|test)_[A-Za-z0-9]+$/.test(keyId.trim())) payItems.push({ key: "RAZORPAY_KEY_ID", label: "Razorpay key ID", required: true, status: "invalid", hint: "Should start with rzp_live_ or rzp_test_." });
  else if (prod && keyId.startsWith("rzp_test_")) payItems.push({ key: "RAZORPAY_KEY_ID", label: "Razorpay key ID", required: true, status: "warn", hint: "Test-mode key in production — real payments will not be collected." });
  else payItems.push({ key: "RAZORPAY_KEY_ID", label: "Razorpay key ID", required: true, status: "ok" });
  payItems.push(secret(env, "RAZORPAY_KEY_SECRET", "Razorpay key secret", { required: true, hint: "Shown once when you generate the API key." }));
  payItems.push(secret(env, "RAZORPAY_WEBHOOK_SECRET", "Razorpay webhook secret", { required: true, min: 12, hint: "Same value you typed when adding the webhook → https://creatorsai.me/api/plans/webhook" }));

  // ── WhatsApp ──────────────────────────────────────────────
  const waAny = ["WHATSAPP_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_APP_SECRET", "WHATSAPP_VERIFY_TOKEN"].some((k) => has(env[k]));
  const waReq = waAny; // optional as a whole, but all-or-nothing once started
  const pid = env.WHATSAPP_PHONE_NUMBER_ID;
  const waItems: CheckItem[] = [
    secret(env, "WHATSAPP_TOKEN", "Permanent access token", { required: waReq, min: 50, hint: "System User token with whatsapp_business_messaging + management, never expires." }),
    !has(pid)
      ? { key: "WHATSAPP_PHONE_NUMBER_ID", label: "Phone number ID", required: waReq, status: waReq ? "missing" : "off", hint: "WhatsApp → API Setup → Phone number ID (not the phone number)." }
      : /^\d{10,20}$/.test(pid.trim())
        ? { key: "WHATSAPP_PHONE_NUMBER_ID", label: "Phone number ID", required: waReq, status: "ok" }
        : { key: "WHATSAPP_PHONE_NUMBER_ID", label: "Phone number ID", required: waReq, status: "invalid", hint: "Must be the numeric ID from API Setup, not +91…" },
    secret(env, "WHATSAPP_APP_SECRET", "App secret (webhook signature)", { required: waReq, min: 16, hint: "App → Settings → Basic → App secret." }),
    secret(env, "WHATSAPP_VERIFY_TOKEN", "Webhook verify token", { required: waReq, min: 16, hint: "Any random string; type the same value in Meta → Configuration → Webhook." }),
  ];
  const lang = env.WA_TEMPLATE_LANG;
  if (has(lang) && !/^[a-z]{2}(_[A-Z]{2})?$/.test(lang)) waItems.push({ key: "WA_TEMPLATE_LANG", label: "Template language", required: false, status: "invalid", hint: "Use a Meta language code such as en, en_US or hi." });

  // ── Email ─────────────────────────────────────────────────
  const emailItems: CheckItem[] = [secret(env, "RESEND_API_KEY", "Resend API key", { required: false, hint: "Optional — without it, notifications stay in-app and on WhatsApp." })];
  if (has(env.RESEND_API_KEY) && !env.RESEND_API_KEY.startsWith("re_")) emailItems[0] = { ...emailItems[0]!, status: "invalid", hint: "Resend keys start with re_" };
  if (has(env.RESEND_API_KEY)) {
    const from = env.EMAIL_FROM ?? "";
    emailItems.push(
      /<[^@\s]+@[^>\s]+>|^[^@\s]+@[^@\s]+$/.test(from.replace(/^"|"$/g, ""))
        ? { key: "EMAIL_FROM", label: "Sender", required: true, status: "ok" }
        : { key: "EMAIL_FROM", label: "Sender", required: true, status: "missing", hint: 'e.g. "CreatorsAI <hello@creatorsai.me>" on a domain verified in Resend.' },
    );
  }

  // ── Cron ──────────────────────────────────────────────────
  const cronItems = [secret(env, "CRON_SECRET", "Cron secret", { required: true, min: 16, hint: "Random 16+ chars. Vercel sends it automatically to /api/cron/*." })];

  // ── Ads (AdSense on /tools and /guides only) ─────────────
  const client = (env.NEXT_PUBLIC_ADSENSE_CLIENT || "ca-pub-4557897331416844").trim();
  const adsOff = env.NEXT_PUBLIC_ADS_ENABLED === "false";
  const slots = ["NEXT_PUBLIC_ADSENSE_SLOT_TOOL", "NEXT_PUBLIC_ADSENSE_SLOT_ARTICLE", "NEXT_PUBLIC_ADSENSE_SLOT_MULTIPLEX"];
  const slotCount = slots.filter((k) => /^\d{6,20}$/.test((env[k] ?? "").trim())).length;
  const badSlot = slots.find((k) => has(env[k]) && !/^\d{6,20}$/.test(env[k]!.trim()));
  const adItems: CheckItem[] = adsOff
    ? [{ key: "NEXT_PUBLIC_ADS_ENABLED", label: "Ads switched off", required: false, status: "off" }]
    : [
        /^ca-pub-\d{10,20}$/.test(client)
          ? { key: "NEXT_PUBLIC_ADSENSE_CLIENT", label: "Publisher ID (also in /ads.txt)", required: false, status: "ok" }
          : { key: "NEXT_PUBLIC_ADSENSE_CLIENT", label: "Publisher ID", required: false, status: "invalid", hint: "Format: ca-pub-0000000000000000" },
        badSlot
          ? { key: badSlot, label: "Ad unit IDs", required: false, status: "invalid", hint: "Ad unit IDs are numbers only (AdSense → Ads → By ad unit)." }
          : slotCount === 0
            ? { key: "NEXT_PUBLIC_ADSENSE_SLOT_TOOL", label: "Ad units", required: false, status: "warn", hint: "No ad units yet — after approval create Display, In-article and Multiplex units and paste their IDs." }
            : { key: "NEXT_PUBLIC_ADSENSE_SLOT_TOOL", label: `Ad units (${slotCount}/3 configured)`, required: false, status: slotCount === 3 ? "ok" : "warn", hint: "Configure all three placements for full coverage." },
      ];

  // ── Runtime ───────────────────────────────────────────────
  const major = Number(nodeVersion.replace(/^v/, "").split(".")[0]);
  const runtime: CheckItem[] = [
    major === 22 || major === 24
      ? { key: "node", label: `Node.js ${nodeVersion}`, required: true, status: "ok" }
      : { key: "node", label: `Node.js ${nodeVersion}`, required: true, status: "warn", hint: "Use Node 22 LTS (package.json engines \"22.x\"; Vercel → Settings → Node.js Version)." },
    env.ADMIN_REQUIRE_MFA === "true"
      ? { key: "ADMIN_REQUIRE_MFA", label: "Admin MFA enforced", required: false, status: "ok" }
      : { key: "ADMIN_REQUIRE_MFA", label: "Admin MFA enforced", required: false, status: prod ? "warn" : "off", hint: "Set ADMIN_REQUIRE_MFA=true once your admin account has 2-step verification." },
  ];

  return finalize([
    { id: "core", title: "Core site", impact: "Links, emails and legal pages", items: core },
    { id: "firebase", title: "Firebase", impact: "Sign-in and every saved action", items: [...fbPublic, saItem] },
    { id: "payments", title: "Razorpay", impact: "Growth plan and Managed Pilot payments", items: payItems },
    { id: "whatsapp", title: "WhatsApp", impact: "OTP, payment reminders and digests on WhatsApp", items: waItems },
    { id: "email", title: "Email (Resend)", impact: "Email digests", items: emailItems },
    { id: "cron", title: "Scheduled jobs", impact: "Daily digests, reminders and Rate Index refresh", items: cronItems },
    { id: "ads", title: "Google AdSense", impact: "Ad revenue from free tools and guides", items: adItems },
    { id: "runtime", title: "Runtime & security", impact: "Stability and admin safety", items: runtime },
  ]);
}

/** Result of a live call to a provider, run only when the admin presses "Test connections". */
export type ProbeResult = { id: string; label: string; ok: boolean; detail: string; ms: number };
