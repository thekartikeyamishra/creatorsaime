import "server-only";
import { FieldValue, type DocumentReference, type Timestamp, type Transaction } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { SCHEMA_VERSION } from "@/lib/config";
import { canonicalTerms, sideOf, type Deal, type Side } from "@/lib/deals";
import { shortId } from "@/lib/ids";
import { maskPhone } from "@/lib/whatsapp";
import type { DealTerms } from "@/lib/schemas";
import { C } from "./collections";
import { sha256 } from "./crypto";
import { ApiError } from "./http";
import { serialize } from "./serialize";

export type DealDoc = Omit<Deal, "id" | "createdAt" | "updatedAt" | "counterpartyWa"> & {
  counterpartyWa?: { waId: string; name: string; lang?: "en" | "hi"; optedInAt: string } | null;
  autoReminderCount?: number;
  lastAutoReminderOn?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  shareLinkHash?: string | null;
  verifiedCompletion?: boolean;
  cancelReason?: string;
  schemaVersion: number;
};

export function dealRef(id: string): DocumentReference {
  if (!/^[A-Za-z0-9]{1,128}$/.test(id)) throw new ApiError(400, "bad_id", "Invalid id");
  return adminDb().collection(C.deals).doc(id);
}

export function termsHash(terms: DealTerms, creatorName: string, brandName: string): string {
  return sha256(canonicalTerms(terms, creatorName, brandName));
}

/** Build deliverables, preserving ids/status of unchanged positions when terms are edited. */
export function buildDeliverables(input: DealTerms["deliverables"], previous: Deal["deliverables"] = [], allApproved = false): Deal["deliverables"] {
  return input.map((d, i) => {
    const prev = previous[i];
    const keep = prev && prev.type === d.type;
    return {
      id: keep ? prev.id : shortId(),
      type: d.type,
      qty: d.qty,
      dueDate: d.dueDate,
      note: d.note,
      status: allApproved ? "approved" : keep ? prev.status : "pending",
      proofUrl: keep ? prev.proofUrl : "",
      // Logged-as-finished deals have no trustworthy delivery date, so none is invented.
      ...(keep && prev.deliveredAt ? { deliveredAt: prev.deliveredAt } : {}),
    };
  });
}

export function termsOf(d: Pick<DealDoc, "title" | "deliverables" | "compensationType" | "feeAmount" | "paymentTerms" | "paymentDueDate" | "usageRights" | "revisionLimit">): DealTerms {
  return {
    title: d.title,
    deliverables: d.deliverables.map((x) => ({ type: x.type as DealTerms["deliverables"][number]["type"], qty: x.qty, dueDate: x.dueDate, note: x.note })),
    compensationType: d.compensationType,
    feeAmount: d.feeAmount,
    paymentTerms: d.paymentTerms,
    paymentDueDate: d.paymentDueDate,
    usageRights: d.usageRights,
    revisionLimit: d.revisionLimit,
  };
}

export function baseDealDoc(args: {
  terms: DealTerms;
  creatorSide: Deal["creatorSide"];
  brandSide: Deal["brandSide"];
  createdBy: string;
  source: Deal["source"];
  campaignId: string | null;
  acceptedSide: Side | null;
  completed: boolean;
}): Record<string, unknown> {
  const nowIso = new Date().toISOString();
  const { terms } = args;
  const ack = args.acceptedSide ? { at: nowIso, by: args.createdBy, via: "account" as const } : null;
  return {
    title: terms.title,
    source: args.source,
    campaignId: args.campaignId,
    createdBy: args.createdBy,
    creatorSide: args.creatorSide,
    brandSide: args.brandSide,
    memberUids: [args.creatorSide.uid, args.brandSide.uid].filter((x): x is string => Boolean(x)),
    deliverables: buildDeliverables(terms.deliverables, [], args.completed),
    compensationType: terms.compensationType,
    feeAmount: terms.feeAmount,
    paymentTerms: terms.paymentTerms,
    paymentDueDate: terms.paymentDueDate,
    usageRights: terms.usageRights,
    revisionLimit: terms.revisionLimit,
    payments: [],
    status: args.completed ? "completed" : "active",
    termsHash: termsHash(terms, args.creatorSide.name, args.brandSide.name),
    acceptance: {
      creator: args.acceptedSide === "creator" ? ack : null,
      brand: args.acceptedSide === "brand" ? ack : null,
    },
    completion: {
      creator: args.completed && args.acceptedSide === "creator" ? ack : null,
      brand: args.completed && args.acceptedSide === "brand" ? ack : null,
    },
    verifiedCompletion: false,
    tracking: { code: null, destinationUrl: "", clicks: 0, promoCode: "", redemptions: 0 },
    invoiceNumber: null,
    shareLinkHash: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    schemaVersion: SCHEMA_VERSION,
  };
}

export async function loadMemberDeal(tx: Transaction, id: string, uid: string): Promise<{ ref: DocumentReference; deal: DealDoc; side: Side; isPodMember: boolean }> {
  const ref = dealRef(id);
  const snap = await tx.get(ref);
  if (!snap.exists) throw new ApiError(404, "not_found", "Deal not found");
  const deal = snap.data() as DealDoc;
  const side = sideOf(deal, uid);
  if (side) return { ref, deal, side, isPodMember: false };
  // Non-lead pod members act on the creator side with limited permissions.
  if (deal.pod?.members.some((m) => m.uid === uid)) return { ref, deal, side: "creator", isPodMember: true };
  throw new ApiError(404, "not_found", "Deal not found");
}

/**
 * When both sides have confirmed completion, record a verified, evidence-backed trust signal
 * for the creator (once). Signals from link-confirmed (no-account) clients are labelled as such.
 * Returns true when the caller must also set `verifiedCompletion: true` in its own update of the deal.
 */
export function maybeRecordVerifiedCompletion(tx: Transaction, ref: DocumentReference, deal: DealDoc, completion: DealDoc["completion"]): boolean {
  if (deal.verifiedCompletion || !completion.creator || !completion.brand) return false;
  const creatorUid = deal.creatorSide.uid;
  // Every non-lead pod member gets credit for a two-sided confirmed pod collaboration.
  for (const m of deal.pod?.members ?? []) {
    if (m.uid === creatorUid) continue;
    tx.create(adminDb().collection(C.trustSignals).doc(), {
      uid: m.uid,
      type: "pod_collaboration_completed",
      detail: { counterparty: deal.brandSide.name, dealId: ref.id, pod: deal.pod!.name, role: m.role },
      evidence: "pod_deal_confirmed_by_both_parties",
      public: true,
      reviewedBy: null,
      at: FieldValue.serverTimestamp(),
      schemaVersion: SCHEMA_VERSION,
    });
  }
  if (creatorUid) {
    const bothAccounts = Boolean(deal.creatorSide.uid && deal.brandSide.uid);
    tx.create(adminDb().collection(C.trustSignals).doc(), {
      uid: creatorUid,
      type: bothAccounts ? "collaboration_completed_verified" : "collaboration_confirmed_by_client",
      detail: { counterparty: deal.brandSide.name, dealId: ref.id },
      evidence: bothAccounts ? "both_parties_confirmed_in_app" : "client_confirmed_via_private_link",
      public: true,
      reviewedBy: null,
      at: FieldValue.serverTimestamp(),
      schemaVersion: SCHEMA_VERSION,
    });
  }
  return true;
}

export function toClientDeal(id: string, d: DealDoc): Deal & { verifiedCompletion: boolean; hasShareLink: boolean } {
  const { shareLinkHash, schemaVersion: _v, counterpartyWa, ...rest } = d;
  void _v;
  return serialize({
    id,
    ...rest,
    counterpartyWa: counterpartyWa ? { optedIn: true, number: maskPhone(counterpartyWa.waId) } : null,
    verifiedCompletion: Boolean(d.verifiedCompletion),
    hasShareLink: Boolean(shareLinkHash),
  });
}
