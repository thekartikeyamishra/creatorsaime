import { adminDb } from "@/lib/firebase/admin";
import { requireAuth, type UserDoc } from "@/lib/server/auth";
import { auditNow } from "@/lib/server/audit";
import { C, profileCollection } from "@/lib/server/collections";
import { route } from "@/lib/server/http";
import { serialize } from "@/lib/server/serialize";

export const runtime = "nodejs";

/** DPDP / GDPR right of access: a machine-readable copy of the user's own data. */
export const GET = route(async (req) => {
  const ctx = await requireAuth(req);
  const db = adminDb();
  const userSnap = await db.collection(C.users).doc(ctx.uid).get();
  const user = userSnap.exists ? (userSnap.data() as UserDoc) : null;

  const [profile, social, brandVerification, consents, requests, waitlist, trust] = await Promise.all([
    user ? db.collection(profileCollection(user.role)).doc(ctx.uid).get() : null,
    db.collection(C.socialAccounts).where("uid", "==", ctx.uid).limit(20).get(),
    db.collection(C.brandVerifications).doc(ctx.uid).get(),
    db.collection(C.consentRecords).where("uid", "==", ctx.uid).limit(200).get(),
    db.collection(C.dataRequests).where("uid", "==", ctx.uid).limit(100).get(),
    user?.waitlistId ? db.collection(C.waitlist).doc(user.waitlistId).get() : null,
    db.collection(C.trustSignals).where("uid", "==", ctx.uid).limit(200).get(),
  ]);

  const payload = serialize({
    exportedAt: new Date().toISOString(),
    account: { uid: ctx.uid, email: ctx.email },
    user,
    profile: profile?.exists ? profile.data() : null,
    socialAccounts: social.docs.map((d) => ({ id: d.id, ...d.data() })),
    brandVerification: brandVerification.exists ? brandVerification.data() : null,
    trustSignals: trust.docs.map((d) => ({ id: d.id, ...d.data() })),
    consentRecords: consents.docs.map((d) => ({ id: d.id, ...d.data() })),
    dataRequests: requests.docs.map((d) => ({ id: d.id, ...d.data() })),
    waitlistEntry: waitlist?.exists ? waitlist.data() : null,
  });

  await auditNow({ actorUid: ctx.uid, actorRole: "user", action: "account.exported", targetType: "user", targetId: ctx.uid });

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="creatorsai-data-${ctx.uid.slice(0, 8)}.json"`,
      "Cache-Control": "no-store",
    },
  });
});
