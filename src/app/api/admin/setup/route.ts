import { requireAdmin } from "@/lib/server/auth";
import { json, route } from "@/lib/server/http";
import { runProbes } from "@/lib/server/setup-probes";
import { setupReport } from "@/lib/setup-check";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin-only. Reports which integrations are configured; `?probe=1` also runs live read-only checks. */
export const GET = route(async (req) => {
  await requireAdmin(req);
  const report = setupReport(process.env, process.versions.node);
  const probe = new URL(req.url).searchParams.get("probe") === "1";
  const probes = probe ? await runProbes() : null;
  return json({ ...report, probes, deployment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown", generatedAt: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
});
