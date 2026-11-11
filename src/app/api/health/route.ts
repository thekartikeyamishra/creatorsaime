import { adminAuth, adminDb, isAdminConfigured } from "@/lib/firebase/admin";
import { classifyFirebaseError } from "@/lib/server/firebase-errors";
import pkg from "../../../../package.json";

const BUILD = { version: pkg.version, commit: (process.env.VERCEL_GIT_COMMIT_SHA ?? "local").slice(0, 7), env: process.env.VERCEL_ENV ?? process.env.NODE_ENV };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Check = { id: string; ok: boolean; code?: string; hint?: string };
let cache: { at: number; body: unknown } | null = null;

async function deepChecks(): Promise<Check[]> {
  const checks: Check[] = [];
  const publicProject = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "";
  checks.push(
    publicProject
      ? { id: "public_firebase_config", ok: true }
      : { id: "public_firebase_config", ok: false, code: "missing_public_config", hint: "Set NEXT_PUBLIC_FIREBASE_* in Vercel and redeploy." },
  );
  if (!isAdminConfigured()) {
    checks.push({ id: "admin_credentials", ok: false, code: "admin_not_configured", hint: "Set FIREBASE_SERVICE_ACCOUNT_BASE64 in Vercel (Production) and redeploy." });
    return checks;
  }
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (b64) {
    try {
      const sa = JSON.parse(Buffer.from(b64.trim(), "base64").toString("utf8")) as { project_id?: string; private_key?: string; client_email?: string };
      if (!sa.private_key || !sa.client_email) checks.push({ id: "admin_credentials", ok: false, code: "admin_key_malformed", hint: "The decoded JSON has no private_key/client_email. Re-encode the full service-account file." });
      else if (publicProject && sa.project_id !== publicProject)
        checks.push({ id: "admin_credentials", ok: false, code: "project_mismatch", hint: `Service account is for a different project than NEXT_PUBLIC_FIREBASE_PROJECT_ID. Generate the key in the same Firebase project.` });
      else checks.push({ id: "admin_credentials", ok: true });
    } catch {
      checks.push({ id: "admin_credentials", ok: false, code: "admin_key_malformed", hint: "FIREBASE_SERVICE_ACCOUNT_BASE64 is not valid base64 of a JSON file." });
    }
  } else checks.push({ id: "admin_credentials", ok: true });

  try {
    await adminAuth().listUsers(1);
    checks.push({ id: "firebase_auth_admin", ok: true });
  } catch (e) {
    const p = classifyFirebaseError(e);
    checks.push({ id: "firebase_auth_admin", ok: false, code: p?.code ?? "auth_admin_failed", hint: p?.hint ?? "Authentication isn't initialised: Firebase console → Authentication → Get started." });
  }
  try {
    await adminDb().collection("_health").limit(1).get();
    checks.push({ id: "firestore", ok: true });
  } catch (e) {
    const p = classifyFirebaseError(e);
    checks.push({ id: "firestore", ok: false, code: p?.code ?? "firestore_failed", hint: p?.hint ?? "Create the Firestore database (Native mode) in the Firebase console." });
  }
  return checks;
}

/**
 * Liveness probe for uptime monitors. `?deep=1` adds a configuration diagnosis (categories and fix hints
 * only — never secret values), cached for 30 s so it can't be used to run up costs.
 */
export async function GET(req: Request) {
  const deep = new URL(req.url).searchParams.get("deep") === "1";
  const headers = { "Cache-Control": "no-store" };
  if (!deep) return Response.json({ ok: true, ...BUILD, backend: isAdminConfigured() ? "configured" : "not_configured", at: new Date().toISOString() }, { headers });
  if (cache && Date.now() - cache.at < 30_000) return Response.json(cache.body, { headers });
  const checks = await deepChecks();
  const body = { ok: checks.every((c) => c.ok), ...BUILD, checks, at: new Date().toISOString() };
  cache = { at: Date.now(), body };
  return Response.json(body, { status: body.ok ? 200 : 503, headers });
}
