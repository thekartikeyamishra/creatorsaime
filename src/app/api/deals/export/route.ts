import { adminDb } from "@/lib/firebase/admin";
import { balance, received, roi, sideOf } from "@/lib/deals";
import { LIMITS_BY_TIER } from "@/lib/plans";
import { requireMember } from "@/lib/server/auth";
import { C } from "@/lib/server/collections";
import { toClientDeal, type DealDoc } from "@/lib/server/deals";
import { ApiError, route } from "@/lib/server/http";
import { getTier } from "@/lib/server/plans";

export const runtime = "nodejs";

function csvCell(v: unknown): string {
  let s = String(v ?? "");
  // Neutralise spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Results/accounts export (CSV). Free for creators; a Growth feature for brands. */
export const GET = route(async (req) => {
  const ctx = await requireMember(req);
  if (ctx.user.role === "brand") {
    const { tier } = await getTier(ctx.uid);
    if (!LIMITS_BY_TIER[tier].resultsExport) throw new ApiError(402, "plan_limit", "CSV export is part of the Growth plan.");
  }
  const snap = await adminDb().collection(C.deals).where("memberUids", "array-contains", ctx.uid).orderBy("updatedAt", "desc").limit(1000).get();
  const header = ["Title", "With", "Status", "Compensation", "Fee (INR)", "Received (INR)", "Balance (INR)", "Payment due", "Deliverables", "Approved", "Clicks", "Redemptions", "Cost per customer (INR)", "Verified by both", "Invoice"];
  const rows = snap.docs.map((d) => {
    const x = toClientDeal(d.id, d.data() as DealDoc);
    const other = sideOf(x, ctx.uid) === "creator" ? x.brandSide.name : x.creatorSide.name;
    return [
      x.title, other, x.status, x.compensationType, x.feeAmount, received(x), balance(x), x.paymentDueDate,
      x.deliverables.map((v) => `${v.qty}x ${v.type}`).join("; "), x.deliverables.filter((v) => v.status === "approved").length,
      x.tracking.clicks, x.tracking.redemptions, roi(x).costPerRedemption ?? "", x.verifiedCompletion ? "yes" : "no", x.invoiceNumber ?? "",
    ];
  });
  const csv = "﻿" + [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="creatorsai-deals-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" },
  });
});
