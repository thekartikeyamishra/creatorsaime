import { adminDb } from "@/lib/firebase/admin";
import { requireAuth, type UserDoc } from "@/lib/server/auth";
import { profileCollection } from "@/lib/server/collections";
import { json, route } from "@/lib/server/http";
import { serialize } from "@/lib/server/serialize";

export const runtime = "nodejs";

/** Who am I? Works for any signed-in Firebase user; `member` is null until an invite is redeemed. */
export const GET = route(async (req) => {
  const ctx = await requireAuth(req);
  const db = adminDb();
  const userSnap = await db.collection("users").doc(ctx.uid).get();
  const user = userSnap.exists ? (userSnap.data() as UserDoc) : null;
  let profile: Record<string, unknown> | null = null;
  if (user) {
    const p = await db.collection(profileCollection(user.role)).doc(ctx.uid).get();
    profile = p.exists ? (p.data() as Record<string, unknown>) : null;
  }
  return json(
    serialize({
      uid: ctx.uid,
      email: ctx.email,
      emailVerified: ctx.emailVerified,
      isAdmin: ctx.isAdmin,
      member: user,
      profile,
    }),
  );
});
