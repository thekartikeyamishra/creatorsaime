import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { requireMember } from "@/lib/server/auth";
import { C } from "@/lib/server/collections";
import { assertSameOrigin, json, readJson, route } from "@/lib/server/http";

export const runtime = "nodejs";

const schema = z.object({ emailDigest: z.boolean().optional(), language: z.enum(["en", "hi"]).optional() });

/** Service emails about your own deals (overdue payments, due dates). Separate from marketing consent. */
export const PUT = route(async (req) => {
  assertSameOrigin(req);
  const ctx = await requireMember(req);
  const body = await readJson(req, schema);
  await adminDb()
    .collection(C.users)
    .doc(ctx.uid)
    .update({ ...(body.emailDigest !== undefined ? { emailDigest: body.emailDigest } : {}), ...(body.language ? { language: body.language } : {}), updatedAt: FieldValue.serverTimestamp() });
  return json({ ok: true, ...body });
});
