"use client";

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendEmailVerification,
  signInWithPopup,
  updateProfile,
} from "firebase/auth";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { clientAuth } from "@/lib/firebase/client";
import { api, ApiClientError } from "@/lib/client/api";
import { useAuth } from "@/lib/client/auth-context";
import { AuthCard, GoogleIcon } from "./auth-card";
import { authErrorMessage } from "./auth-errors";
import { Button, Field, Input, Notice, Spinner, cx } from "./ui";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/config";

const INVITE_RE = /^[A-Za-z0-9_-]{20,80}$/;
const PENDING = "cai.signup.pending";
type Pending = { role: Role; name: string; city: string; marketing: boolean };

function savePending(p: Pending) {
  try { sessionStorage.setItem(PENDING, JSON.stringify(p)); localStorage.setItem(PENDING, JSON.stringify(p)); } catch { /* ignore */ }
}
function readPending(): Partial<Pending> {
  try { return JSON.parse(sessionStorage.getItem(PENDING) || localStorage.getItem(PENDING) || "{}"); } catch { return {}; }
}
function clearPending() {
  try { sessionStorage.removeItem(PENDING); localStorage.removeItem(PENDING); } catch { /* ignore */ }
}

export function SignupFlow() {
  const params = useSearchParams();
  const router = useRouter();
  const { configured, loading, user, me, refreshMe, signOut } = useAuth();
  const [invite, setInvite] = useState(params.get("invite") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);

  // Already a member → straight to the dashboard.
  useEffect(() => {
    if (me?.member) router.replace("/dashboard");
  }, [me, router]);

  const validInvite = INVITE_RE.test(invite);

  async function redeem() {
    setBusy("redeem");
    setError(null);
    try {
      await clientAuth()?.currentUser?.getIdToken(true); // pick up fresh email_verified claim
      await api("/api/invite/redeem", { body: { code: invite } });
      await refreshMe();
      router.replace("/dashboard/profile?welcome=1");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not accept the invite. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function createWithEmail(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const auth = clientAuth();
    if (!auth) return;
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    if (password.length < 10) {
      setError("Use at least 10 characters for your password.");
      return;
    }
    setBusy("create");
    setError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (name) await updateProfile(cred.user, { displayName: name });
      await sendEmailVerification(cred.user, { url: `${window.location.origin}/signup?invite=${encodeURIComponent(invite)}` });
      setVerificationSent(true);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function google() {
    const auth = clientAuth();
    if (!auth) return;
    setBusy("google");
    setError(null);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function checkVerified() {
    const u = clientAuth()?.currentUser;
    if (!u) return;
    setBusy("check");
    await u.reload();
    setBusy(null);
    if (u.emailVerified) await redeem();
    else setError("Your email isn't verified yet. Click the link in the email we sent, then try again.");
  }

  async function resend() {
    const u = clientAuth()?.currentUser;
    if (!u) return;
    setBusy("resend");
    try {
      await sendEmailVerification(u, { url: `${window.location.origin}/signup?invite=${encodeURIComponent(invite)}` });
      setVerificationSent(true);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  if (!configured) {
    return (
      <AuthCard title="Create your account">
        <Notice tone="warn">Sign-up is not configured yet. Add the Firebase settings from .env.example.</Notice>
      </AuthCard>
    );
  }
  if (loading) return <AuthCard title="Create your account"><Spinner /></AuthCard>;

  if (!validInvite) return <OpenSignup />;

  // Signed in: either verify email, or accept.
  if (user) {
    const isPassword = user.providerData.some((p) => p.providerId === "password");
    const needsVerification = isPassword && !user.emailVerified;
    return (
      <AuthCard title="Accept your invite" subtitle={<>Signed in as <strong>{user.email}</strong></>}>
        <div className="space-y-4">
          {needsVerification ? (
            <>
              <Notice tone="info">
                {verificationSent ? "We sent a verification link to your email." : "Verify your email to accept the invite."} Open it, then come back and continue.
              </Notice>
              <Button className="w-full" onClick={checkVerified} loading={busy === "check" || busy === "redeem"}>I&apos;ve verified — continue</Button>
              <Button variant="ghost" className="w-full" onClick={resend} loading={busy === "resend"}>Resend email</Button>
            </>
          ) : (
            <Button className="w-full" onClick={redeem} loading={busy === "redeem"}>Accept invite &amp; create my profile</Button>
          )}
          {error && <Notice tone="error">{error}</Notice>}
          <button type="button" onClick={signOut} className="text-sm text-muted hover:text-ink">Use a different account</button>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="You're invited" subtitle="Create your account with the same email your invite was sent to.">
      <div className="space-y-5">
        <Button variant="secondary" className="w-full" onClick={google} loading={busy === "google"}>
          <GoogleIcon /> Continue with Google
        </Button>
        <div className="flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
        </div>
        <form onSubmit={createWithEmail} className="space-y-4">
          <Field label="Name" htmlFor="name">
            <Input id="name" name="name" autoComplete="name" required maxLength={80} />
          </Field>
          <Field label="Email" htmlFor="email">
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </Field>
          <Field label="Password" htmlFor="password" hint="At least 10 characters">
            <Input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required />
          </Field>
          {error && <Notice tone="error">{error}</Notice>}
          <Button type="submit" className="w-full" loading={busy === "create"}>Create account</Button>
        </form>
        <p className="text-sm text-muted">
          Already have an account? <Link href={`/login?next=${encodeURIComponent(`/signup?invite=${invite}`)}`} className="font-medium text-brand hover:underline">Sign in</Link>
        </p>
      </div>
    </AuthCard>
  );
}


function RolePicker({ value, onChange }: { value: Role; onChange: (r: Role) => void }) {
  return (
    <div role="radiogroup" aria-label="I am a" className="grid grid-cols-3 gap-2">
      {ROLES.map((r) => (
        <button
          key={r}
          type="button"
          role="radio"
          aria-checked={value === r}
          onClick={() => onChange(r)}
          className={cx("rounded-xl px-2 py-2.5 text-sm font-medium ring-1 transition", value === r ? "bg-ink text-white ring-ink" : "bg-white ring-line hover:ring-slate-300")}
        >
          {ROLE_LABELS[r]}
        </button>
      ))}
    </div>
  );
}

function Consent({ terms, setTerms, marketing, setMarketing }: { terms: boolean; setTerms: (b: boolean) => void; marketing: boolean; setMarketing: (b: boolean) => void }) {
  return (
    <div className="space-y-2 text-sm">
      <label className="flex items-start gap-2.5">
        <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5 size-4 accent-[var(--color-brand)]" required />
        <span>I agree to the <Link href="/terms" target="_blank" className="font-medium text-brand hover:underline">Terms</Link> and <Link href="/privacy" target="_blank" className="font-medium text-brand hover:underline">Privacy Policy</Link>.</span>
      </label>
      <label className="flex items-start gap-2.5 text-muted">
        <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="mt-0.5 size-4 accent-[var(--color-brand)]" />
        <span>Send me occasional product updates (optional).</span>
      </label>
    </div>
  );
}

/** Free account for everyone. Email accounts verify their address first; Google accounts are already verified. */
function OpenSignup() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, refreshMe, signOut } = useAuth();
  const pending = typeof window !== "undefined" ? readPending() : {};
  const initialRole = (ROLES as readonly string[]).includes(params.get("role") ?? "") ? (params.get("role") as Role) : pending.role ?? "creator";
  const [role, setRole] = useState<Role>(initialRole);
  const [name, setName] = useState(pending.name ?? "");
  const [city, setCity] = useState(pending.city ?? "");
  const [terms, setTerms] = useState(false);
  const [marketing, setMarketing] = useState(pending.marketing ?? false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (user?.displayName && !name) setName(user.displayName);
  }, [user, name]);

  async function finish(details?: Pending) {
    const d = details ?? { role, name: name.trim(), city: city.trim(), marketing };
    setBusy("finish");
    setError(null);
    try {
      await clientAuth()?.currentUser?.getIdToken(true); // fresh email_verified claim
      await api("/api/account/register", { body: { role: d.role, name: d.name, city: d.city, marketingConsent: d.marketing, termsAccepted: true } });
      clearPending();
      await refreshMe();
      router.replace("/dashboard/profile?welcome=1");
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "already_member") {
        await refreshMe();
        router.replace("/dashboard");
        return;
      }
      setError(err instanceof ApiClientError ? (err.status >= 500 ? `${err.message} (${err.code})` : err.message) : "Could not finish sign-up. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function createWithEmail(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const auth = clientAuth();
    if (!auth) return;
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");
    if (name.trim().length < 2) return setError("Enter your name.");
    if (password.length < 10) return setError("Use at least 10 characters for your password.");
    if (!terms) return setError("Please accept the Terms and Privacy Policy.");
    setBusy("create");
    setError(null);
    savePending({ role, name: name.trim(), city: city.trim(), marketing });
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name.trim() });
      await sendEmailVerification(cred.user, { url: `${window.location.origin}/signup` });
      setSent(true);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function google() {
    const auth = clientAuth();
    if (!auth) return;
    if (!terms) return setError("Please accept the Terms and Privacy Policy first.");
    setBusy("google");
    setError(null);
    try {
      savePending({ role, name: name.trim(), city: city.trim(), marketing });
      const cred = await signInWithPopup(auth, new GoogleAuthProvider());
      await finish({ role, name: name.trim() || cred.user.displayName || cred.user.email?.split("@")[0] || "Member", city: city.trim(), marketing });
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function checkVerified() {
    const u = clientAuth()?.currentUser;
    if (!u) return;
    setBusy("check");
    setError(null);
    await u.reload().catch(() => {});
    setBusy(null);
    if (!u.emailVerified) return setError("Not verified yet. Open the link in the email we sent (check spam), then press continue.");
    const p = readPending();
    await finish({ role: p.role ?? role, name: p.name || name.trim() || u.displayName || "Member", city: p.city ?? city, marketing: p.marketing ?? marketing });
  }

  async function resend() {
    const u = clientAuth()?.currentUser;
    if (!u) return;
    setBusy("resend");
    try {
      await sendEmailVerification(u, { url: `${window.location.origin}/signup` });
      setSent(true);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  // Signed in with an unverified email → verify first.
  if (user && user.providerData.some((p) => p.providerId === "password") && !user.emailVerified) {
    return (
      <AuthCard title="Check your inbox" subtitle={<>We sent a verification link to <strong>{user.email}</strong>.</>}>
        <div className="space-y-4">
          <Notice tone="info">{sent ? "Email sent. " : ""}Open the link, then come back here and continue. It can take a minute — check spam too.</Notice>
          <Button className="w-full" onClick={checkVerified} loading={busy === "check" || busy === "finish"}>I&apos;ve verified — continue</Button>
          <Button variant="ghost" className="w-full" onClick={resend} loading={busy === "resend"}>Resend email</Button>
          {error && <Notice tone="error">{error}</Notice>}
          <button type="button" onClick={signOut} className="text-sm text-muted hover:text-ink">Use a different account</button>
        </div>
      </AuthCard>
    );
  }

  // Signed in and verified, but no CreatorsAI account yet → finish setup.
  if (user) {
    return (
      <AuthCard title="Finish setting up" subtitle={<>Signed in as <strong>{user.email}</strong></>}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (!terms) return setError("Please accept the Terms and Privacy Policy."); void finish(); }}>
          <RolePicker value={role} onChange={setRole} />
          <Field label="Name" htmlFor="name"><Input id="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} autoComplete="name" /></Field>
          <Field label="City" htmlFor="city" optional><Input id="city" value={city} onChange={(e) => setCity(e.target.value)} maxLength={60} autoComplete="address-level2" /></Field>
          <Consent terms={terms} setTerms={setTerms} marketing={marketing} setMarketing={setMarketing} />
          {error && <Notice tone="error">{error}</Notice>}
          <Button type="submit" className="w-full" loading={busy === "finish"}>Create my free account</Button>
          <button type="button" onClick={signOut} className="text-sm text-muted hover:text-ink">Use a different account</button>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Create your free account"
      subtitle="Deal Desk, payment reminders and your Trust Passport — free for creators."
    >
      <div className="space-y-5">
        <RolePicker value={role} onChange={setRole} />
        <form onSubmit={createWithEmail} className="space-y-4">
          <Field label="Name" htmlFor="name"><Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required maxLength={80} /></Field>
          <Field label="Email" htmlFor="email"><Input id="email" name="email" type="email" autoComplete="email" required /></Field>
          <Field label="Password" htmlFor="password" hint="At least 10 characters"><Input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required /></Field>
          <Field label="City" htmlFor="city" optional><Input id="city" value={city} onChange={(e) => setCity(e.target.value)} maxLength={60} autoComplete="address-level2" /></Field>
          <Consent terms={terms} setTerms={setTerms} marketing={marketing} setMarketing={setMarketing} />
          {error && <Notice tone="error">{error}</Notice>}
          <Button type="submit" className="w-full" loading={busy === "create"}>Create free account</Button>
        </form>
        <div className="flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" /></div>
        <Button variant="secondary" className="w-full" onClick={google} loading={busy === "google" || busy === "finish"}>
          <GoogleIcon /> Continue with Google
        </Button>
        <InviteBox />
        <p className="text-sm text-muted">Already have an account? <Link href="/login" className="font-medium text-brand hover:underline">Sign in</Link></p>
      </div>
    </AuthCard>
  );
}

function InviteBox() {
  const router = useRouter();
  const [v, setV] = useState("");
  const code = /invite=([A-Za-z0-9_-]+)/.exec(v)?.[1] ?? v.trim();
  return (
    <details className="rounded-xl bg-paper px-4 py-3 text-sm">
      <summary className="cursor-pointer font-medium">Have an invite link?</summary>
      <div className="mt-3 flex gap-2">
        <Input aria-label="Invite link or code" value={v} onChange={(e) => setV(e.target.value)} placeholder="Paste your invite link" />
        <Button type="button" variant="secondary" disabled={!INVITE_RE.test(code)} onClick={() => router.push(`/signup?invite=${encodeURIComponent(code)}`)}>Use</Button>
      </div>
    </details>
  );
}
