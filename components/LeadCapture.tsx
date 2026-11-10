"use client";

import { useState } from "react";
import { Mail, Check, Loader2 } from "lucide-react";

/**
 * Soft email capture. No pop-up, no exit-intent trap, no fake urgency.
 *
 * Wiring: set NEXT_PUBLIC_NEWSLETTER_ENDPOINT to your provider's form/API
 * endpoint (Formspree, Buttondown, ConvertKit form action, etc.). We POST
 * { email } as JSON and treat any 2xx as success.
 *
 * If no endpoint is configured the form is not rendered at all. The previous
 * version showed "You're on the list." with no endpoint set, which told real
 * visitors they had subscribed when nothing had been stored anywhere. Silently
 * dropping an address someone deliberately handed over is the kind of thing
 * that costs trust exactly once.
 */
const ENDPOINT = process.env.NEXT_PUBLIC_NEWSLETTER_ENDPOINT;

export default function LeadCapture() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState("");

  if (!ENDPOINT) {
    if (process.env.NODE_ENV === "production") return null;
    return (
      <section className="mx-auto my-20 max-w-3xl px-5">
        <div className="rounded-3xl border border-dashed border-ink-600 p-8 text-center text-sm text-bone-faint">
          Newsletter form hidden: set NEXT_PUBLIC_NEWSLETTER_ENDPOINT to enable it.
        </div>
      </section>
    );
  }

  async function submit() {
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
      setError("Enter a valid email address.");
      setStatus("idle");
      return;
    }
    setError("");
    setStatus("loading");

    // Never let a hung provider leave the button spinning forever.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);

    try {
      const res = await fetch(ENDPOINT as string, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email: trimmed }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      setStatus("done");
    } catch {
      setStatus("error");
      setError("Couldn't sign you up just now. Please try again in a moment.");
    } finally {
      clearTimeout(timer);
    }
  }

  return (
    <section className="mx-auto my-20 max-w-3xl px-5">
      <div className="rounded-3xl border border-ink-700 bg-ink-800/60 p-8 text-center md:p-12">
        <Mail className="mx-auto mb-4 text-coral" size={28} aria-hidden />
        <h2 className="font-display text-3xl text-bone">Fresh prompts, every week</h2>
        <p className="mx-auto mt-3 max-w-md text-bone-dim">
          New tested prompts and tool breakdowns. No spam, unsubscribe anytime.
        </p>

        {status === "done" ? (
          <p className="mt-6 inline-flex items-center gap-2 text-sage" role="status">
            <Check size={18} aria-hidden /> You&apos;re on the list.
          </p>
        ) : (
          <div className="mx-auto mt-6 flex max-w-md flex-col gap-3 sm:flex-row">
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              id="newsletter-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              placeholder="you@email.com"
              disabled={status === "loading"}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "newsletter-error" : undefined}
              className="flex-1 rounded-xl border border-ink-600 bg-ink px-4 py-3 text-bone placeholder:text-bone-faint focus:border-coral/50 focus:outline-none disabled:opacity-60"
            />
            <button
              type="button"
              onClick={submit}
              disabled={status === "loading"}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-coral px-6 py-3 font-medium text-ink transition-colors hover:bg-coral-soft disabled:opacity-70"
            >
              {status === "loading" ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden />
                  Joining…
                </>
              ) : (
                "Subscribe"
              )}
            </button>
          </div>
        )}
        {error && (
          <p id="newsletter-error" role="alert" className="mt-2 text-sm text-coral-soft">
            {error}
          </p>
        )}
        <p className="mt-4 text-xs text-bone-faint">
          We only use your address for this newsletter. See our{" "}
          <a href="/privacy/" className="text-coral hover:underline">
            privacy policy
          </a>
          .
        </p>
      </div>
    </section>
  );
}
