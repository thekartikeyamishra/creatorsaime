import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb, isAdminConfigured } from "@/lib/firebase/admin";
import { site } from "@/lib/config";
import { C } from "@/lib/server/collections";
import { keyedHash } from "@/lib/server/crypto";
import { clientIp } from "@/lib/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Link-preview fetchers (WhatsApp, Instagram, etc.) and crawlers must not inflate click counts.
const BOT_RE = /bot|crawl|spider|preview|facebookexternalhit|whatsapp|telegram|slack|discord|twitter|linkedin|skype|headless|curl|wget|python|axios|node-fetch/i;

function redirect(to: string): Response {
  return new Response(null, { status: 302, headers: { Location: to, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer-when-downgrade" } });
}

/** Tracked short link: counts unique human clicks (per visitor per day), then redirects. */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }): Promise<Response> {
  const { code } = await params;
  if (!/^[0-9A-HJKMNP-TV-Z]{7}$/.test(code) || !isAdminConfigured()) return redirect(site.url);
  const db = adminDb();
  let destination: string | null = null;
  let dealId: string | null = null;
  try {
    const link = await db.collection(C.trackingLinks).doc(code).get();
    destination = (link.get("destination") as string | undefined) || null;
    dealId = (link.get("dealId") as string | undefined) || null;
  } catch (err) {
    console.error("[r] lookup failed", err);
  }
  if (!destination || !dealId || !/^https?:\/\//i.test(destination)) return redirect(site.url);

  const ua = req.headers.get("user-agent") || "";
  if (ua && !BOT_RE.test(ua)) {
    try {
      const day = new Date().toISOString().slice(0, 10);
      const key = keyedHash(`${code}:${clientIp(req)}:${ua.slice(0, 120)}:${day}`).slice(0, 40);
      await db.collection(C.clickDedupe).doc(key).create({ expiresAt: Timestamp.fromMillis(Date.now() + 2 * 86_400_000) });
      await db.collection(C.deals).doc(dealId).update({ "tracking.clicks": FieldValue.increment(1) });
    } catch {
      // Duplicate click today (ALREADY_EXISTS) or transient failure — never block the redirect.
    }
  }
  return redirect(destination);
}
