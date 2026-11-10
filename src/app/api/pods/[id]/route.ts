import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { POD_LIMITS, type PodMember } from "@/lib/pods";
import { podActionSchema } from "@/lib/schemas";
import { auditIn } from "@/lib/server/audit";
import { requireMember } from "@/lib/server/auth";
import { C } from "@/lib/server/collections";
import { ApiError, assertSameOrigin, json, readJson, route } from "@/lib/server/http";
import { getReliabilityMany } from "@/lib/server/insights";
import { notifyIn } from "@/lib/server/notify";
import { indexes, podRef, type PodDoc } from "@/lib/server/pods";
import { enforceRateLimit, RULES } from "@/lib/server/rate-limit";
import { serialize } from "@/lib/server/serialize";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

export const GET = route<Ctx>(async (req, { params }) => {
  const ctx = await requireMember(req);
  const { id } = await params;
  const snap = await podRef(id).get();
  const pod = snap.data() as PodDoc | undefined;
  if (!pod || (!pod.memberUids.includes(ctx.uid) && !(pod.isPublic && pod.status === "active"))) throw new ApiError(404, "not_found", "Pod not found");
  const db = adminDb();
  const profiles = await db.getAll(...pod.activeUids.map((u) => db.collection(C.creatorProfiles).doc(u)));
  const verified: Record<string, string[]> = {};
  for (const p of profiles) verified[p.id] = (p.get("verifiedPlatforms") as string[] | undefined) ?? [];
  const rel = await getReliabilityMany(pod.activeUids);
  return json(serialize({ item: { id, ...pod }, verified, reliability: Object.fromEntries(Object.entries(rel).map(([k, v]) => [k, v.asCreator])), isLead: pod.leadUid === ctx.uid }));
});

export const PATCH = route<Ctx>(async (req, { params }) => {
  assertSameOrigin(req);
  const ctx = await requireMember(req);
  await enforceRateLimit(RULES.writePerUser, ctx.uid);
  const { id } = await params;
  const body = await readJson(req, podActionSchema);
  const db = adminDb();
  const ref = podRef(id);

  // Resolve invite target before the transaction (handles are immutable enough for this read).
  let invitee: { uid: string; displayName: string; role: string } | null = null;
  if (body.action === "invite") {
    const h = await db.collection(C.handles).doc(body.handle).get();
    if (!h.exists) throw new ApiError(404, "not_found", "No member with that handle.");
    const u = await db.collection(C.users).doc(h.get("uid") as string).get();
    if (!u.exists || u.get("status") !== "active") throw new ApiError(404, "not_found", "No member with that handle.");
    if (u.get("role") === "brand") throw new ApiError(400, "wrong_role", "Pods are for creators and creative professionals.");
    invitee = { uid: u.id, displayName: u.get("displayName") as string, role: u.get("role") as string };
  }

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const pod = snap.data() as PodDoc | undefined;
    if (!pod || !pod.memberUids.includes(ctx.uid)) throw new ApiError(404, "not_found", "Pod not found");
    if (pod.status === "archived") throw new ApiError(409, "archived", "This pod is archived.");
    const isLead = pod.leadUid === ctx.uid;
    const leadOnly = () => {
      if (!isLead) throw new ApiError(403, "forbidden", "Only the pod lead can do that.");
    };
    let members: PodMember[] = pod.members;
    const now = FieldValue.serverTimestamp();
    const extra: Record<string, unknown> = {};

    switch (body.action) {
      case "update":
        leadOnly();
        Object.assign(extra, body.details);
        break;
      case "invite": {
        leadOnly();
        if (members.length >= POD_LIMITS.maxMembers) throw new ApiError(400, "limit_reached", `Pods have at most ${POD_LIMITS.maxMembers} members.`);
        if (members.some((m) => m.uid === invitee!.uid)) throw new ApiError(409, "already_member", "Already in this pod or invited.");
        members = [...members, { uid: invitee!.uid, displayName: invitee!.displayName, handle: body.handle, role: body.role, sharePct: body.sharePct, status: "invited" }];
        notifyIn(tx, invitee!.uid, { type: "pod_invite", title: `${ctx.user.displayName} invited you to the pod "${pod.name}"`, body: `Role: ${body.role} · ${body.sharePct}% share`, href: `/dashboard/pods/${id}` });
        break;
      }
      case "set_members": {
        leadOnly();
        const byUid = new Map(body.members.map((m) => [m.uid, m]));
        members = members.map((m) => {
          const n = byUid.get(m.uid);
          return n ? { ...m, role: n.role, sharePct: n.sharePct } : m;
        });
        break;
      }
      case "remove":
        leadOnly();
        if (body.uid === pod.leadUid) throw new ApiError(400, "invalid", "The lead can't be removed. Archive the pod instead.");
        members = members.filter((m) => m.uid !== body.uid);
        break;
      case "accept_invite":
      case "decline_invite": {
        const me = members.find((m) => m.uid === ctx.uid);
        if (!me || me.status !== "invited") throw new ApiError(409, "no_invite", "There is no pending invite.");
        members = body.action === "accept_invite" ? members.map((m) => (m.uid === ctx.uid ? { ...m, status: "active" as const } : m)) : members.filter((m) => m.uid !== ctx.uid);
        notifyIn(tx, pod.leadUid, {
          type: "pod_invite",
          title: `${ctx.user.displayName} ${body.action === "accept_invite" ? "joined" : "declined"} "${pod.name}"`,
          href: `/dashboard/pods/${id}`,
        });
        break;
      }
      case "leave":
        if (isLead) throw new ApiError(400, "invalid", "Leads can't leave — archive the pod instead.");
        members = members.filter((m) => m.uid !== ctx.uid);
        break;
      case "archive":
        leadOnly();
        extra.status = "archived";
        break;
    }
    tx.update(ref, { ...extra, members, ...indexes(members), updatedAt: now });
    auditIn(tx, { actorUid: ctx.uid, actorRole: "user", action: `pod.${body.action}`, targetType: "pod", targetId: id });
  });
  return json({ ok: true });
});
