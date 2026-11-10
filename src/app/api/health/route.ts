import { isAdminConfigured } from "@/lib/firebase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Liveness/readiness probe for uptime monitors. Reveals no secrets. */
export function GET() {
  return Response.json({ ok: true, backend: isAdminConfigured() ? "configured" : "not_configured", at: new Date().toISOString() });
}
