import { describe, expect, it } from "vitest";
import { setupReport } from "@/lib/setup-check";

const sa = Buffer.from(JSON.stringify({ project_id: "creatorsai", private_key: "x", client_email: "a@b" })).toString("base64");
const full = {
  NODE_ENV: "production",
  NEXT_PUBLIC_SITE_URL: "https://creatorsai.me",
  HASH_SALT: "x".repeat(40),
  NEXT_PUBLIC_SUPPORT_EMAIL: "hello@creatorsai.me",
  NEXT_PUBLIC_GRIEVANCE_EMAIL: "grievance@creatorsai.me",
  NEXT_PUBLIC_FIREBASE_API_KEY: "k",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "d",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "creatorsai",
  NEXT_PUBLIC_FIREBASE_APP_ID: "a",
  FIREBASE_SERVICE_ACCOUNT_BASE64: sa,
  RAZORPAY_KEY_ID: "rzp_live_abc123",
  RAZORPAY_KEY_SECRET: "s",
  RAZORPAY_WEBHOOK_SECRET: "w".repeat(20),
  CRON_SECRET: "c".repeat(20),
  ADMIN_REQUIRE_MFA: "true",
};
const item = (r: ReturnType<typeof setupReport>, key: string) => r.groups.flatMap((g) => g.items).find((i) => i.key === key);

describe("setupReport", () => {
  it("is ready with all required values and WhatsApp/email off", () => {
    const r = setupReport(full, "22.11.0");
    expect(r.summary.ready).toBe(true);
    expect(item(r, "WHATSAPP_TOKEN")?.status).toBe("off");
    expect(item(r, "RESEND_API_KEY")?.status).toBe("off");
  });
  it("never includes secret values in the output", () => {
    const out = JSON.stringify(setupReport({ ...full, RAZORPAY_KEY_SECRET: "TOPSECRET-VALUE" }));
    expect(out).not.toContain("TOPSECRET-VALUE");
    expect(out).not.toContain(full.HASH_SALT);
  });
  it("flags missing core values", () => {
    const r = setupReport({ NODE_ENV: "production" });
    expect(r.summary.ready).toBe(false);
    expect(item(r, "RAZORPAY_KEY_ID")?.status).toBe("missing");
    expect(item(r, "CRON_SECRET")?.status).toBe("missing");
  });
  it("warns on a test Razorpay key in production and on Node 26", () => {
    const r = setupReport({ ...full, RAZORPAY_KEY_ID: "rzp_test_abc" }, "26.13.0");
    expect(item(r, "RAZORPAY_KEY_ID")?.status).toBe("warn");
    expect(item(r, "node")?.status).toBe("warn");
  });
  it("makes WhatsApp all-or-nothing and validates the phone number ID", () => {
    const r = setupReport({ ...full, WHATSAPP_TOKEN: "t".repeat(60), WHATSAPP_PHONE_NUMBER_ID: "+91 98765 43210" });
    expect(item(r, "WHATSAPP_PHONE_NUMBER_ID")?.status).toBe("invalid");
    expect(item(r, "WHATSAPP_APP_SECRET")?.status).toBe("missing");
  });
  it("rejects a service account from another project and short secrets", () => {
    const r = setupReport({ ...full, NEXT_PUBLIC_FIREBASE_PROJECT_ID: "other", HASH_SALT: "short" });
    expect(item(r, "FIREBASE_SERVICE_ACCOUNT_BASE64")?.status).toBe("invalid");
    expect(item(r, "HASH_SALT")?.status).toBe("invalid");
  });
  it("checks Resend key prefix and sender", () => {
    const r = setupReport({ ...full, RESEND_API_KEY: "abc" });
    expect(item(r, "RESEND_API_KEY")?.status).toBe("invalid");
    expect(item(r, "EMAIL_FROM")?.status).toBe("missing");
    const ok = setupReport({ ...full, RESEND_API_KEY: "re_123", EMAIL_FROM: '"CreatorsAI <hello@creatorsai.me>"' });
    expect(item(ok, "EMAIL_FROM")?.status).toBe("ok");
  });
});
