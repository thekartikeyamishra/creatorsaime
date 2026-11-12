import "server-only";
import { cert, getApps, initializeApp, applicationDefault, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/**
 * Lazily-initialised Firebase Admin SDK.
 * Never initialised at import time, so builds succeed without credentials and
 * missing configuration surfaces as a clean 503 instead of a crash.
 */

export class ServiceUnavailableError extends Error {
  constructor(message = "Service temporarily unavailable") {
    super(message);
    this.name = "ServiceUnavailableError";
  }
}

let app: App | null = null;

export function isAdminConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      process.env.K_SERVICE || // Cloud Run / App Hosting provide ADC
      process.env.FIRESTORE_EMULATOR_HOST,
  ) && Boolean(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT);
}

export type ServiceAccount = { project_id?: string; client_email?: string; private_key?: string };

/**
 * Reads the service account from env. Accepts base64 (recommended) or raw JSON pasted by mistake,
 * strips wrapping quotes, and repairs private keys whose newlines arrived as literal "\\n".
 * Returns null instead of throwing so callers decide how to report it.
 */
export function parseServiceAccount(value: string): ServiceAccount | null {
  try {
    const raw = value.trim().replace(/^["']|["']$/g, "");
    const json = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    const sa = JSON.parse(json) as ServiceAccount;
    if (typeof sa !== "object" || !sa) return null;
    if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, "\n");
    return sa;
  } catch {
    return null;
  }
}

function getAdminApp(): App {
  if (app) return app;
  const existing = getApps()[0];
  if (existing) {
    app = existing;
    return app;
  }
  if (!isAdminConfigured()) {
    throw new ServiceUnavailableError("Firebase Admin is not configured");
  }
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (b64) {
    const parsed = parseServiceAccount(b64);
    if (!parsed) throw new ServiceUnavailableError("FIREBASE_SERVICE_ACCOUNT_BASE64 is not valid base64 JSON");
    app = initializeApp({
      credential: cert({
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
        privateKey: parsed.private_key,
      }),
      projectId: parsed.project_id ?? projectId,
    });
  } else {
    app = initializeApp({ credential: applicationDefault(), projectId });
  }
  return app;
}

let db: Firestore | null = null;

export function adminDb(): Firestore {
  if (db) return db;
  db = getFirestore(getAdminApp());
  // preferRest: plain HTTPS instead of long-lived gRPC streams — no native/stream crashes on serverless,
  // faster cold starts, and identical behaviour for our request/response workload.
  db.settings({ ignoreUndefinedProperties: true, preferRest: true });
  return db;
}

export function adminAuth(): Auth {
  return getAuth(getAdminApp());
}
