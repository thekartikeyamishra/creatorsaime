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
import { Button, Field, Input, Notice, Spinner } from "./ui";

const INVITE_RE = /^[A-Za-z0-9_-]{20,80}$/;

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
      <AuthCard title="Accept your invite">
        <Notice tone="warn">Sign-up is not configured yet. Add the Firebase settings from .env.example.</Notice>
      </AuthCard>
    );
  }
  if (loading) return <AuthCard title="Accept your invite"><Spinner /></AuthCard>;

  if (!validInvite) {
    return (
      <AuthCard title="CreatorsAI is invite-only" subtitle="Paste the invite link or code from your email.">
        <div className="space-y-4">
          <Field label="Invite code" htmlFor="invite">
            <Input
              id="invite"
              value={invite}
              onChange={(e) => {
                const v = e.target.value.trim();
                const m = /invite=([A-Za-z0-9_-]+)/.exec(v);
                setInvite(m ? m[1]! : v);
              }}
              placeholder="Paste your invite link"
            />
          </Field>
          {invite && <p className="text-xs text-red-600">That doesn&apos;t look like a valid invite code.</p>}
          <p className="text-sm text-muted">
            No invite? <Link href="/join" className="font-medium text-brand hover:underline">Request one</Link> — it takes a minute.
          </p>
        </div>
      </AuthCard>
    );
  }

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
