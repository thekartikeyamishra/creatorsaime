// Creates (or resets) a ready-to-use TEST account: verified email, password, member + private creator profile.
// The password is passed on the command line and never stored in the repo.
//
// Usage (PowerShell, in the project folder):
//   $env:FIREBASE_SERVICE_ACCOUNT_BASE64 = "<same value as in Vercel>"
//   npm run create-test-user -- test@creatorsai.me "test@1234"
//   npm run create-test-user -- test@creatorsai.me --delete      # remove it before public launch
//
// Requires Email/Password sign-in enabled: Firebase console → Authentication → Sign-in method.
import { cert, initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const [email, second] = process.argv.slice(2);
if (!email || !email.includes("@") || !second) {
  console.error('Usage: npm run create-test-user -- <email> "<password>" | --delete');
  process.exit(1);
}
const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
try {
  initializeApp({ credential: b64 ? cert(JSON.parse(Buffer.from(b64, "base64").toString("utf8"))) : applicationDefault() });
} catch (e) {
  console.error("Could not load admin credentials. Set FIREBASE_SERVICE_ACCOUNT_BASE64 (or GOOGLE_APPLICATION_CREDENTIALS).", e.message);
  process.exit(1);
}
const auth = getAuth();
const db = getFirestore();

function explain(e) {
  const m = `${e?.message ?? ""} ${e?.details ?? ""}`;
  if (/CONFIGURATION_NOT_FOUND|no configuration corresponding/i.test(m)) return "Firebase Authentication isn't initialised. Firebase console → Authentication → Get started → enable Email/Password.";
  if (/database \(default\) does not exist/i.test(m) || (e?.code === 5)) return "Firestore database doesn't exist. Firebase console → Firestore Database → Create database (Native mode, asia-south1).";
  if (/has not been used|SERVICE_DISABLED/i.test(m)) return "Cloud Firestore API is disabled. Create the database from the Firebase console (it enables the API).";
  if (e?.code === 7 || /PERMISSION_DENIED/i.test(m)) return "The service account can't access this project. Use a key generated in THIS Firebase project.";
  if (e?.code === 16 || /invalid_grant|UNAUTHENTICATED/i.test(m)) return "The key was rejected (revoked or wrong project). Generate a new private key.";
  return null;
}
const fail = (e) => {
  const hint = explain(e);
  console.error(`\n✖ ${hint ?? (e?.message || e)}`);
  process.exit(1);
};
process.on("unhandledRejection", fail);
process.on("uncaughtException", fail);

async function find() {
  try {
    return await auth.getUserByEmail(email);
  } catch (e) {
    if (e.code === "auth/user-not-found") return null;
    throw e;
  }
}

if (second === "--delete") {
  const u = await find();
  if (!u) {
    console.log("No such user.");
    process.exit(0);
  }
  const userDoc = await db.collection("users").doc(u.uid).get();
  const batch = db.batch();
  if (userDoc.exists) {
    const handle = userDoc.get("handle");
    if (handle) batch.delete(db.collection("handles").doc(handle));
    batch.delete(userDoc.ref);
  }
  for (const col of ["creatorProfiles", "brandProfiles"]) batch.delete(db.collection(col).doc(u.uid));
  await batch.commit();
  await auth.deleteUser(u.uid);
  console.log(`Deleted test user ${email}.`);
  process.exit(0);
}

const password = second;
if (password.length < 6) {
  console.error("Firebase requires at least 6 characters.");
  process.exit(1);
}

let user = await find();
if (user) {
  user = await auth.updateUser(user.uid, { password, emailVerified: true, disabled: false });
  console.log(`Updated existing auth user (uid ${user.uid}).`);
} else {
  user = await auth.createUser({ email, password, emailVerified: true, displayName: "Test Creator" });
  console.log(`Created auth user (uid ${user.uid}).`);
}

const userRef = db.collection("users").doc(user.uid);
if ((await userRef.get()).exists) {
  console.log("Member profile already exists — ready to sign in.");
} else {
  let handle = "test-creator";
  for (let i = 0; i < 5 && (await db.collection("handles").doc(handle).get()).exists; i++) handle = `test-creator-${Math.random().toString(36).slice(2, 6)}`;
  const now = FieldValue.serverTimestamp();
  const batch = db.batch();
  batch.create(userRef, {
    uid: user.uid, role: "creator", email, displayName: "Test Creator", handle, status: "active", waitlistId: null,
    joinedVia: "script", isTest: true, marketingConsent: false, createdAt: now, updatedAt: now, schemaVersion: 1,
  });
  batch.create(db.collection("handles").doc(handle), { uid: user.uid, createdAt: now });
  batch.create(db.collection("creatorProfiles").doc(user.uid), {
    uid: user.uid, kind: "creator", displayName: "Test Creator", handle, bio: "", city: "Prayagraj", categories: [], languages: [],
    portfolioLinks: [], rateCardNote: "", openToPods: true, isPublic: false, verifiedPlatforms: [], createdAt: now, updatedAt: now, schemaVersion: 1,
  });
  await batch.commit();
  console.log(`Created member + private creator profile (@${handle}).`);
}
console.log(`\nReady: sign in at /login with ${email}. Remove before public launch:  npm run create-test-user -- ${email} --delete`);
process.exit(0);
