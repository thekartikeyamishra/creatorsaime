import "server-only";
import { FieldValue, type Transaction, type WriteBatch } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";

export type AuditEntry = {
  actorUid: string | null;
  actorRole: "admin" | "user" | "system" | "public";
  action: string;
  targetType: string;
  targetId: string;
  meta?: Record<string, string | number | boolean | null>;
};

/**
 * Append-only audit log. Firestore rules deny all client access; no code path updates or deletes entries.
 * Never put raw PII (emails, phone numbers) into `meta`.
 */
function toDoc(entry: AuditEntry) {
  return { ...entry, meta: entry.meta ?? {}, at: FieldValue.serverTimestamp() };
}

/** Add an audit entry atomically inside an existing transaction or batch. */
export function auditIn(writer: Transaction | WriteBatch, entry: AuditEntry): void {
  const ref = adminDb().collection("auditLogs").doc();
  (writer as WriteBatch).create(ref, toDoc(entry));
}

/** Write an audit entry immediately (awaited, so serverless runtimes don't drop it). */
export async function auditNow(entry: AuditEntry): Promise<void> {
  try {
    await adminDb().collection("auditLogs").doc().create(toDoc(entry));
  } catch (err) {
    console.error("[audit] failed to write entry", err);
  }
}
