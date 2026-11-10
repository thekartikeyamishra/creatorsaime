import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { requireMember } from "@/lib/server/auth";
import { C } from "@/lib/server/collections";
import { ApiError, assertSameOrigin, json, readJson, route } from "@/lib/server/http";

export const runtime = "nodejs";

const bodySchema = z.object({ action: z.enum(["ready_for_review", "remove"]) });

export const PATCH = route<{ params: Promise<{ id: string }> }>(async (req, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireMember(req);
  const { id } = await params;
  const { action } = await readJson(req, bodySchema);
  const db = adminDb();
  const ref = db.collection(C.socialAccounts).doc(id);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    // Same response for missing and not-owned: avoids leaking other users' document IDs.
    if (!snap.exists || snap.get("uid") !== ctx.uid) throw new ApiError(404, "not_found", "Account not found");
    const status = snap.get("status") as string;
    if (action === "ready_for_review") {
      if (status !== "awaiting_code" && status !== "rejected") throw new ApiError(409, "invalid_state", "This account is already under review or verified.");
      tx.update(ref, { status: "pending_review", updatedAt: FieldValue.serverTimestamp() });
    } else {
      if (status === "verified") throw new ApiError(409, "verified_locked", "Verified accounts can be removed by contacting support.");
      tx.delete(ref);
    }
  });
  return json({ ok: true });
});
