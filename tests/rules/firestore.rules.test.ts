/**
 * Firestore security rules tests. Run with the emulator:  npm run test:rules
 * (requires Java 11+ and firebase-tools; the script starts/stops the emulator for you).
 */
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { doc, getDoc, setDoc, collection, getDocs, deleteDoc } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-creatorsai",
    firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 },
  });
});
afterAll(async () => env?.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "users/alice"), { role: "creator", handle: "alice-1", status: "active" });
    await setDoc(doc(db, "users/bob"), { role: "brand", handle: "bob-1", status: "active" });
    await setDoc(doc(db, "creatorProfiles/alice"), { displayName: "Alice" });
    await setDoc(doc(db, "waitlist/abc"), { email: "x@y.z" });
    await setDoc(doc(db, "auditLogs/1"), { action: "x" });
    await setDoc(doc(db, "invites/h"), { email: "x@y.z" });
  });
});

describe("users", () => {
  it("can read own user doc", async () => {
    await assertSucceeds(getDoc(doc(env.authenticatedContext("alice").firestore(), "users/alice")));
  });
  it("cannot read another user's doc", async () => {
    await assertFails(getDoc(doc(env.authenticatedContext("alice").firestore(), "users/bob")));
  });
  it("cannot list users", async () => {
    await assertFails(getDocs(collection(env.authenticatedContext("alice").firestore(), "users")));
  });
  it("cannot write own user doc (e.g. escalate role or unsuspend)", async () => {
    await assertFails(setDoc(doc(env.authenticatedContext("alice").firestore(), "users/alice"), { role: "brand", status: "active" }));
  });
  it("unauthenticated cannot read", async () => {
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "users/alice")));
  });
});

describe("profiles", () => {
  it("own profile readable, not writable", async () => {
    const db = env.authenticatedContext("alice").firestore();
    await assertSucceeds(getDoc(doc(db, "creatorProfiles/alice")));
    await assertFails(setDoc(doc(db, "creatorProfiles/alice"), { verifiedPlatforms: ["instagram"] }));
  });
});

describe("server-only collections", () => {
  for (const path of ["waitlist/abc", "auditLogs/1", "invites/h"]) {
    it(`${path} is not readable or deletable by users`, async () => {
      const db = env.authenticatedContext("alice", { admin: true }).firestore();
      await assertFails(getDoc(doc(db, path)));
      await assertFails(deleteDoc(doc(db, path)));
    });
  }
  it("public cannot create waitlist entries directly", async () => {
    await assertFails(setDoc(doc(env.unauthenticatedContext().firestore(), "waitlist/new"), { email: "a@b.c" }));
  });
});
