// Grants (or revokes) the admin custom claim. Admin rights can ONLY be set from this script —
// never from the app. Usage (PowerShell or bash):
//   node scripts/set-admin.mjs you@example.com          # grant
//   node scripts/set-admin.mjs you@example.com --revoke # revoke
// Requires credentials: GOOGLE_APPLICATION_CREDENTIALS=path\to\service-account.json
//   or FIREBASE_SERVICE_ACCOUNT_BASE64 in the environment.
import { cert, initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const [email, flag] = process.argv.slice(2);
if (!email || !email.includes("@")) {
  console.error("Usage: node scripts/set-admin.mjs <email> [--revoke]");
  process.exit(1);
}
const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
initializeApp({ credential: b64 ? cert(JSON.parse(Buffer.from(b64, "base64").toString("utf8"))) : applicationDefault() });

const auth = getAuth();
const user = await auth.getUserByEmail(email);
const revoke = flag === "--revoke";
await auth.setCustomUserClaims(user.uid, { ...(user.customClaims ?? {}), admin: !revoke });
await auth.revokeRefreshTokens(user.uid); // force a fresh token carrying the new claim
console.log(`${revoke ? "Revoked" : "Granted"} admin for ${email} (uid ${user.uid}). Sign out and back in.`);
