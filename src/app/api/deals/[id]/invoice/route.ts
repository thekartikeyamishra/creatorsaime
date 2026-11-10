import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { auditIn } from "@/lib/server/audit";
import { requireMember } from "@/lib/server/auth";
import { C } from "@/lib/server/collections";
import { loadMemberDeal, toClientDeal } from "@/lib/server/deals";
import { ApiError, assertSameOrigin, json, route } from "@/lib/server/http";
import { serialize } from "@/lib/server/serialize";

export const runtime = "nodejs";

/**
 * Issues (once) a sequential invoice number for the creator side of a deal and returns everything
 * needed to render a printable invoice. Sequential numbering per issuer is a GST requirement.
 */
export const POST = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireMember(req);
  const { id } = await params;
  const db = adminDb();
  const billingRef = db.collection(C.billingProfiles).doc(ctx.uid);

  const out = await db.runTransaction(async (tx) => {
    const { ref, deal, side } = await loadMemberDeal(tx, id, ctx.uid);
    if (side !== "creator") throw new ApiError(403, "forbidden", "Invoices are issued by the creator side of a deal.");
    if (deal.compensationType === "barter" || deal.feeAmount <= 0) throw new ApiError(409, "no_fee", "This deal has no fee to invoice.");
    const billingSnap = await tx.get(billingRef);
    if (!billingSnap.exists || !billingSnap.get("legalName")) throw new ApiError(409, "billing_required", "Add your billing details first.");
    const billing = billingSnap.data()!;
    let invoiceNumber = deal.invoiceNumber;
    let issuedAt = (deal as unknown as { invoiceIssuedAt?: string }).invoiceIssuedAt ?? null;
    if (!invoiceNumber) {
      const seq = (billing.nextInvoiceSeq as number | undefined) ?? 1;
      const year = new Date().getFullYear();
      invoiceNumber = `${billing.invoicePrefix || "INV"}-${year}-${String(seq).padStart(4, "0")}`;
      issuedAt = new Date().toISOString();
      tx.set(billingRef, { nextInvoiceSeq: seq + 1 }, { merge: true });
      tx.update(ref, { invoiceNumber, invoiceIssuedAt: issuedAt, updatedAt: FieldValue.serverTimestamp() });
      auditIn(tx, { actorUid: ctx.uid, actorRole: "user", action: "deal.invoice_issued", targetType: "deal", targetId: id, meta: { invoiceNumber } });
    }
    return { deal: { ...toClientDeal(id, deal), invoiceNumber }, billing: serialize(billing), issuedAt };
  });
  return json(out);
});
