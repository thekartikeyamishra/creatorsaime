import "server-only";
import { Timestamp } from "firebase-admin/firestore";

/** Recursively converts Firestore Timestamps to ISO strings so responses are plain JSON. */
export function serialize<T = unknown>(value: unknown): T {
  if (value instanceof Timestamp) return value.toDate().toISOString() as T;
  if (Array.isArray(value)) return value.map((v) => serialize(v)) as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = serialize(v);
    return out as T;
  }
  return value as T;
}
