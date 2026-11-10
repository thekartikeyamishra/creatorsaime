import { safeEqual } from "@/lib/server/crypto";
import { runInsights } from "@/lib/server/insights";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Nightly 08:00 IST (before the 09:00 digest): rebuild Trust Graph + Rate & Results Index. */
export async function GET(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || !safeEqual(req.headers.get("authorization") || "", `Bearer ${secret}`)) return new Response("unauthorized", { status: 401 });
  const r = await runInsights();
  return Response.json({ ok: true, ...r });
}
