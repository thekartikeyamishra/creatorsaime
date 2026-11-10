import { adminDb } from "@/lib/firebase/admin";
import { requireMember } from "@/lib/server/auth";
import { C } from "@/lib/server/collections";
import { ApiError, json, route } from "@/lib/server/http";
import { serialize } from "@/lib/server/serialize";

export const runtime = "nodejs";

export const GET = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  const ctx = await requireMember(req);
  const { id } = await params;
  if (!/^order_[A-Za-z0-9]{6,40}$/.test(id)) throw new ApiError(404, "not_found", "Receipt not found");
  const db = adminDb();
  const snap = await db.collection(C.orders).doc(id).get();
  if (!snap.exists || snap.get("uid") !== ctx.uid || snap.get("status") !== "paid") throw new ApiError(404, "not_found", "Receipt not found");
  const billing = await db.collection(C.billingProfiles).doc(ctx.uid).get();
  return json(serialize({ order: { id, ...snap.data() }, billing: billing.exists ? { legalName: billing.get("legalName"), address: billing.get("address"), gstin: billing.get("gstin") } : null }));
});
