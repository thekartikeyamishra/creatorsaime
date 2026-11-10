import "server-only";
import { FieldValue, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { SCHEMA_VERSION } from "@/lib/config";
import type { Deal } from "@/lib/deals";
import { aggregateBenchmarks, computeReliability, sampleFromDeal, type BenchmarkSample, type Reliability } from "@/lib/insights";
import { C } from "./collections";
import { toClientDeal, type DealDoc } from "./deals";
import { serialize } from "./serialize";

const MAX_SCAN = 50_000;

async function scanCompletedDeals(): Promise<Deal[]> {
  const db = adminDb();
  const out: Deal[] = [];
  let last: QueryDocumentSnapshot | undefined;
  for (;;) {
    let q = db.collection(C.deals).where("status", "==", "completed").orderBy("__name__").limit(500);
    if (last) q = q.startAfter(last);
    const page = await q.get();
    for (const d of page.docs) out.push(toClientDeal(d.id, d.data() as DealDoc));
    if (page.size < 500 || out.length >= MAX_SCAN) break;
    last = page.docs[page.docs.length - 1];
  }
  return out;
}

/** Nightly: rebuild the Trust Graph (reliability) and the Rate & Results Index from completed deals. */
export async function runInsights(): Promise<{ deals: number; reliabilityDocs: number; benchmarks: number; samples: number }> {
  const db = adminDb();
  const deals = await scanCompletedDeals();

  // ── Trust Graph ──
  const uids = new Set<string>();
  for (const d of deals) if ((d as Deal & { verifiedCompletion?: boolean }).verifiedCompletion) d.memberUids.forEach((u) => uids.add(u));
  const byUid = new Map<string, Deal[]>();
  for (const d of deals)
    for (const u of d.memberUids) {
      if (!uids.has(u)) continue;
      const list = byUid.get(u);
      if (list) list.push(d);
      else byUid.set(u, [d]);
    }

  let batch = db.batch();
  let ops = 0;
  const flush = async () => {
    if (ops) await batch.commit();
    batch = db.batch();
    ops = 0;
  };
  for (const [uid, list] of byUid) {
    const r = computeReliability(uid, list);
    batch.set(db.collection(C.reliability).doc(uid), { uid, ...r, updatedAt: FieldValue.serverTimestamp(), schemaVersion: SCHEMA_VERSION });
    if (++ops >= 450) await flush();
  }
  await flush();

  // ── Rate & Results Index ──
  const creatorUids = [...new Set(deals.map((d) => d.creatorSide.uid).filter((x): x is string => Boolean(x)))];
  const profiles = new Map<string, { city: string; categories: string[] }>();
  for (let i = 0; i < creatorUids.length; i += 100) {
    const refs = creatorUids.slice(i, i + 100).map((u) => db.collection(C.creatorProfiles).doc(u));
    const snaps = refs.length ? await db.getAll(...refs) : [];
    for (const s of snaps) if (s.exists) profiles.set(s.id, { city: (s.get("city") as string) || "", categories: (s.get("categories") as string[]) || [] });
  }
  const samples: BenchmarkSample[] = [];
  for (const d of deals) {
    const s = sampleFromDeal(d, d.creatorSide.uid ? profiles.get(d.creatorSide.uid) : undefined);
    if (s) samples.push(s);
  }
  const benches = aggregateBenchmarks(samples);
  const keep = new Set<string>();
  for (const b of benches) {
    const id = Buffer.from(b.key).toString("base64url").slice(0, 400);
    keep.add(id);
    batch.set(db.collection(C.benchmarks).doc(id), { ...b, updatedAt: FieldValue.serverTimestamp() });
    if (++ops >= 450) await flush();
  }
  const existing = await db.collection(C.benchmarks).select().get();
  for (const doc of existing.docs) {
    if (!keep.has(doc.id)) {
      batch.delete(doc.ref);
      if (++ops >= 450) await flush();
    }
  }
  await flush();
  return { deals: deals.length, reliabilityDocs: byUid.size, benchmarks: benches.length, samples: samples.length };
}

export async function getReliability(uid: string): Promise<Reliability | null> {
  const s = await adminDb().collection(C.reliability).doc(uid).get();
  return s.exists ? serialize<Reliability>({ asCreator: s.get("asCreator"), asBrand: s.get("asBrand") }) : null;
}

export async function getReliabilityMany(uids: string[]): Promise<Record<string, Reliability>> {
  const db = adminDb();
  const out: Record<string, Reliability> = {};
  const unique = [...new Set(uids)].slice(0, 300);
  for (let i = 0; i < unique.length; i += 100) {
    const refs = unique.slice(i, i + 100).map((u) => db.collection(C.reliability).doc(u));
    if (!refs.length) continue;
    for (const s of await db.getAll(...refs)) if (s.exists) out[s.id] = { asCreator: s.get("asCreator"), asBrand: s.get("asBrand") };
  }
  return out;
}
