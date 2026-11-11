import "server-only";
import { adminDb, isAdminConfigured } from "@/lib/firebase/admin";
import type { ProbeResult } from "@/lib/setup-check";

const GRAPH = "https://graph.facebook.com/v21.0";

async function timed(id: string, label: string, fn: () => Promise<{ ok: boolean; detail: string }>): Promise<ProbeResult> {
  const t0 = Date.now();
  try {
    const r = await fn();
    return { id, label, ...r, ms: Date.now() - t0 };
  } catch (e) {
    const detail = e instanceof Error && e.name === "TimeoutError" ? "Timed out after 6s" : "Request failed (network or credentials)";
    return { id, label, ok: false, detail, ms: Date.now() - t0 };
  }
}

const sig = () => AbortSignal.timeout(6_000);

/**
 * Live, read-only calls that prove each credential works. Never writes, never sends a message,
 * never echoes a secret — only a short human-readable status.
 */
export async function runProbes(env: Record<string, string | undefined> = process.env): Promise<ProbeResult[]> {
  const jobs: Array<Promise<ProbeResult>> = [];

  jobs.push(
    timed("firebase", "Firestore (admin)", async () => {
      if (!isAdminConfigured()) return { ok: false, detail: "Admin credentials not set" };
      await adminDb().collection("_setup_probe").limit(1).get();
      return { ok: true, detail: "Connected" };
    }),
  );

  const keyId = env.RAZORPAY_KEY_ID, keySecret = env.RAZORPAY_KEY_SECRET;
  if (keyId && keySecret) {
    jobs.push(
      timed("razorpay", "Razorpay API keys", async () => {
        const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
        const res = await fetch("https://api.razorpay.com/v1/orders?count=1", { headers: { Authorization: `Basic ${auth}` }, signal: sig(), cache: "no-store" });
        if (res.status === 401) return { ok: false, detail: "Rejected — key ID and secret do not match" };
        if (!res.ok) return { ok: false, detail: `Razorpay responded ${res.status}` };
        return { ok: true, detail: `Valid (${keyId.startsWith("rzp_live_") ? "live" : "test"} mode)` };
      }),
    );
  }

  if (env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID) {
    jobs.push(
      timed("whatsapp", "WhatsApp Cloud API", async () => {
        const url = `${GRAPH}/${encodeURIComponent(env.WHATSAPP_PHONE_NUMBER_ID!)}?fields=display_phone_number,verified_name,quality_rating`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}` }, signal: sig(), cache: "no-store" });
        const body = (await res.json().catch(() => ({}))) as { display_phone_number?: string; verified_name?: string; quality_rating?: string; error?: { code?: number; message?: string } };
        if (!res.ok) {
          const code = body.error?.code;
          const detail = code === 190 ? "Token expired or invalid — generate a permanent System User token" : code === 100 ? "Phone number ID not found for this token" : `Meta responded ${res.status}`;
          return { ok: false, detail };
        }
        return { ok: true, detail: `${body.verified_name ?? "Business"} · ${body.display_phone_number ?? ""} · quality ${body.quality_rating ?? "n/a"}`.trim() };
      }),
    );
  }

  if (env.RESEND_API_KEY) {
    jobs.push(
      timed("resend", "Resend sender domain", async () => {
        const res = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${env.RESEND_API_KEY}` }, signal: sig(), cache: "no-store" });
        if (res.status === 401 || res.status === 403) return { ok: false, detail: "API key rejected" };
        if (!res.ok) return { ok: false, detail: `Resend responded ${res.status}` };
        const body = (await res.json()) as { data?: Array<{ name: string; status: string }> };
        const fromDomain = (env.EMAIL_FROM ?? "").match(/@([^>\s"]+)/)?.[1]?.toLowerCase();
        const d = body.data?.find((x) => x.name.toLowerCase() === fromDomain);
        if (!fromDomain) return { ok: false, detail: "EMAIL_FROM has no address" };
        if (!d) return { ok: false, detail: `Domain ${fromDomain} is not added in Resend` };
        return d.status === "verified" ? { ok: true, detail: `${fromDomain} verified` } : { ok: false, detail: `${fromDomain} is ${d.status} — finish the DNS records` };
      }),
    );
  }

  return Promise.all(jobs);
}
