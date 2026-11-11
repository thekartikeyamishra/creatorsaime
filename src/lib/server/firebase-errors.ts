/**
 * Turns low-level Firebase Admin / Firestore failures into a known, actionable category.
 * Used by the API error handler (→ 503 with a stable code instead of an opaque 500) and by /api/health.
 * Never includes secrets — only a category and a fix hint.
 */
export type FirebaseProblem = { code: string; hint: string };

export function classifyFirebaseError(err: unknown): FirebaseProblem | null {
  if (!err || typeof err !== "object") return null;
  const e = err as { code?: unknown; message?: unknown; details?: unknown };
  const msg = `${typeof e.message === "string" ? e.message : ""} ${typeof e.details === "string" ? e.details : ""}`;
  const code = e.code;

  if (/database \(default\) does not exist|database.*not.*exist/i.test(msg) || (code === 5 && /database/i.test(msg))) {
    return { code: "firestore_database_missing", hint: "Create the Firestore database: Firebase console → Firestore Database → Create database (Native mode, asia-south1)." };
  }
  if (/Cloud Firestore API has not been used|firestore\.googleapis\.com.*disabled|SERVICE_DISABLED/i.test(msg)) {
    return { code: "firestore_api_disabled", hint: "Enable the Cloud Firestore API for this project (Google Cloud console → APIs & Services), or create the database from the Firebase console." };
  }
  if (/Datastore Mode|datastore mode/i.test(msg)) {
    return { code: "firestore_wrong_mode", hint: "The database is in Datastore mode. CreatorsAI needs Firestore in Native mode." };
  }
  if (code === 7 || /PERMISSION_DENIED|Missing or insufficient permissions|does not have .*permission/i.test(msg)) {
    return { code: "firestore_permission_denied", hint: "The service account can't access Firestore. Use a key generated from Firebase → Project settings → Service accounts for THIS project." };
  }
  if (code === 16 || /UNAUTHENTICATED|invalid_grant|invalid JWT|Invalid JWT Signature|account not found/i.test(msg)) {
    return { code: "admin_credentials_rejected", hint: "Google rejected the service-account key (revoked or from another project). Generate a new key and update FIREBASE_SERVICE_ACCOUNT_BASE64, then redeploy." };
  }
  if (/Failed to parse private key|Invalid PEM|private_key|DECODER routines/i.test(msg)) {
    return { code: "admin_key_malformed", hint: "FIREBASE_SERVICE_ACCOUNT_BASE64 is malformed. Re-encode the whole JSON file with PowerShell [Convert]::ToBase64String and paste it on one line." };
  }
  if (code === 14 || code === 4 || /UNAVAILABLE|DEADLINE_EXCEEDED|ECONNRESET|ETIMEDOUT/i.test(msg)) {
    return { code: "firestore_unavailable", hint: "Firestore was temporarily unreachable. Retry; if it persists, check status.cloud.google.com." };
  }
  if (code === 9 && /index/i.test(msg)) {
    return { code: "firestore_index_missing", hint: "A Firestore index is missing. Deploy indexes: npx -y firebase-tools@15 deploy --only firestore:indexes" };
  }
  return null;
}
