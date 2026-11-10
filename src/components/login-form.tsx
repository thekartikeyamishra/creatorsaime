"use client";

import { GoogleAuthProvider, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { clientAuth } from "@/lib/firebase/client";
import { useAuth } from "@/lib/client/auth-context";
import { AuthCard, GoogleIcon } from "./auth-card";
import { authErrorMessage, safeNext } from "./auth-errors";
import { Button, Field, Input, Notice } from "./ui";

export function LoginForm() {
  const { configured, user, loading } = useAuth();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState<"email" | "google" | "reset" | null>(null);
  const [email, setEmail] = useState("");

  useEffect(() => {
    if (!loading && user) router.replace(next);
  }, [loading, user, next, router]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const auth = clientAuth();
    if (!auth) return;
    const password = String(new FormData(e.currentTarget).get("password") ?? "");
    setBusy("email");
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
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

  async function reset() {
    const auth = clientAuth();
    if (!auth) return;
    if (!email.includes("@")) {
      setError("Enter your email above first.");
      return;
    }
    setBusy("reset");
    setError(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch {
      /* Don't reveal whether the account exists. */
    } finally {
      setInfo("If an account exists for that email, a reset link is on its way.");
      setBusy(null);
    }
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle={
        <>
          CreatorsAI is invite-only. No invite yet? <Link href="/join" className="font-medium text-brand hover:underline">Request one</Link>.
        </>
      }
    >
      {!configured ? (
        <Notice tone="warn">Sign-in is not configured yet. Add the Firebase settings from .env.example.</Notice>
      ) : (
        <div className="space-y-5">
          <Button variant="secondary" className="w-full" onClick={google} loading={busy === "google"}>
            <GoogleIcon /> Continue with Google
          </Button>
          <div className="flex items-center gap-3 text-xs text-muted">
            <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
          </div>
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Email" htmlFor="email">
              <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Password" htmlFor="password">
              <Input id="password" name="password" type="password" autoComplete="current-password" required />
            </Field>
            {error && <Notice tone="error">{error}</Notice>}
            {info && <Notice tone="info">{info}</Notice>}
            <Button type="submit" className="w-full" loading={busy === "email"}>Sign in</Button>
          </form>
          <button type="button" onClick={reset} disabled={busy !== null} className="text-sm font-medium text-brand hover:underline">
            Forgot password?
          </button>
        </div>
      )}
    </AuthCard>
  );
}
