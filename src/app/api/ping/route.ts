// Dependency-free liveness check: if this works but /api/health?deep=1 doesn't, the problem is in Firebase setup.
export const dynamic = "force-dynamic";
export function GET() {
  return Response.json({ ok: true, node: process.versions.node, region: process.env.VERCEL_REGION ?? "local", at: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
