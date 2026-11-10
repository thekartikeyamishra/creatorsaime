import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { SCHEMA_VERSION } from "@/lib/config";
import { generateVerificationCode } from "@/lib/ids";
import { detectPlatform } from "@/lib/readiness";
import { socialSubmissionSchema } from "@/lib/schemas";
import { requireMember } from "@/lib/server/auth";
import { C } from "@/lib/server/collections";
import { ApiError, assertSameOrigin, json, readJson, route } from "@/lib/server/http";
import { enforceRateLimit, RULES } from "@/lib/server/rate-limit";
import { serialize } from "@/lib/server/serialize";

export const runtime = "nodejs";
const MAX_ACCOUNTS = 6;

export const GET = route(async (req) => {
  const ctx = await requireMember(req);
  const snap = await adminDb().collection(C.socialAccounts).where("uid", "==", ctx.uid).limit(MAX_ACCOUNTS + 2).get();
  return json(serialize({ accounts: snap.docs.map((d) => ({ id: d.id, ...d.data() })) }));
});

export const POST = route(async (req) => {
  assertSameOrigin(req);
  const ctx = await requireMember(req);
  if (ctx.user.role === "brand") throw new ApiError(403, "wrong_role", "Social verification is for creators and professionals.");
  await enforceRateLimit(RULES.verificationPerUser, ctx.uid);
  const input = await readJson(req, socialSubmissionSchema);

  const detected = detectPlatform(input.url);
  if (input.platform !== "other" && detected !== input.platform) {
    throw new ApiError(400, "platform_mismatch", "The link doesn't match the selected platform.");
  }

  const db = adminDb();
  const existing = await db.collection(C.socialAccounts).where("uid", "==", ctx.uid).limit(MAX_ACCOUNTS + 1).get();
  if (existing.size >= MAX_ACCOUNTS) throw new ApiError(400, "too_many_accounts", `You can add up to ${MAX_ACCOUNTS} accounts.`);
  if (existing.docs.some((d) => d.get("url") === input.url)) throw new ApiError(409, "duplicate_account", "You've already added this account.");

  const ref = db.collection(C.socialAccounts).doc();
  const now = FieldValue.serverTimestamp();
  const doc = {
    uid: ctx.uid,
    platform: input.platform,
    url: input.url,
    handle: input.handle,
    followerCountSelfReported: input.followerCountSelfReported ?? null,
    metricsSource: "self_reported",
    verificationCode: generateVerificationCode(),
    method: "bio_code_manual_review",
    status: "awaiting_code",
    reviewNote: "",
    reviewedBy: null,
    reviewedAt: null,
    createdAt: now,
    updatedAt: now,
    schemaVersion: SCHEMA_VERSION,
  };
  await ref.create(doc);
  return json({ id: ref.id, verificationCode: doc.verificationCode, status: doc.status }, 201);
});
