/** Maps Firebase Auth error codes to friendly messages without leaking whether an account exists. */
export function authErrorMessage(err: unknown): string {
  const code = typeof err === "object" && err && "code" in err ? String((err as { code: unknown }).code) : "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-email":
      return "Email or password is incorrect.";
    case "auth/email-already-in-use":
      return "An account already exists with this email. Sign in instead.";
    case "auth/weak-password":
      return "Use a stronger password (at least 10 characters).";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a few minutes and try again.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Sign-in was cancelled.";
    case "auth/popup-blocked":
      return "Your browser blocked the sign-in popup. Allow popups and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/missing-password":
      return "Enter your password.";
    case "auth/user-disabled":
      return "This account has been disabled. Contact support.";
    case "auth/operation-not-allowed":
    case "auth/admin-restricted-operation":
      return "This sign-in method isn't switched on for CreatorsAI yet. (Admin: Firebase console → Authentication → Sign-in method → enable Email/Password and Google.)";
    case "auth/configuration-not-found":
    case "auth/project-not-found":
      return "Sign-in isn't set up for this site yet. (Admin: open Firebase console → Authentication → Get started, then enable Email/Password.)";
    case "auth/unauthorized-domain":
      return "This website address isn't allowed to sign in yet. (Admin: Firebase → Authentication → Settings → Authorized domains → add creatorsai.me and www.creatorsai.me.)";
    case "auth/api-key-not-valid.-please-pass-a-valid-api-key.":
    case "auth/invalid-api-key":
      return "Sign-in is misconfigured (invalid API key). (Admin: check NEXT_PUBLIC_FIREBASE_API_KEY in Vercel and redeploy.)";
    case "auth/requests-from-referer-are-blocked":
    case "auth/requests-to-this-api-identitytoolkit-method-are-blocked.":
      return "Sign-in is blocked by the API key's restrictions. (Admin: Google Cloud → Credentials → your browser key → allow creatorsai.me and the Identity Toolkit API.)";
    case "auth/multi-factor-auth-required":
      return "This account uses two-step verification, which isn't supported on this sign-in screen yet. Contact support.";
    default:
      return "Something went wrong. Please try again.";
  }
}

/** Only allow same-site relative redirects (prevents open-redirects). */
export function safeNext(next: string | null, fallback = "/dashboard"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
