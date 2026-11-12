"use client";

import { useEffect, useState } from "react";
import { api, ApiClientError } from "@/lib/client/api";
import { REVIEW_TAGS, REVIEW_TEXT_MAX, type ReviewSubject } from "@/lib/reviews";
import { Button, Card, Input, Notice, cx } from "./ui";

type State = {
  canReview: boolean;
  reason: "ok" | "not_verified" | "already_reviewed" | "subject_not_member";
  mine: { rating: number; tags: string[]; text: string } | null;
  subject: ReviewSubject;
  subjectName: string;
};

const LABELS = ["", "Poor", "Below expectations", "Good", "Great", "Outstanding"];

export function Stars({ value, size = "text-lg" }: { value: number; size?: string }) {
  return (
    <span aria-label={`${value} out of 5`} className={cx("tracking-tight text-amber-500", size)}>
      {"★".repeat(Math.round(value))}
      <span className="text-slate-300">{"★".repeat(5 - Math.round(value))}</span>
    </span>
  );
}

/**
 * Verified review for a completed deal. `endpoint` is the member route or the private-link route.
 * Renders nothing until the deal is confirmed by both sides — reviews are earned, not requested.
 */
export function ReviewPanel({ endpoint, askName = false, defaultName = "", afterSubmit, auth = true }: { endpoint: string; askName?: boolean; defaultName?: string; afterSubmit?: React.ReactNode; auth?: boolean }) {
  const [state, setState] = useState<State | null>(null);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [text, setText] = useState("");
  const [name, setName] = useState(defaultName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    api<{ review: State | null }>(endpoint, { auth })
      .then((r) => setState(r.review))
      .catch(() => setState(null));
  }, [endpoint, auth]);

  if (!state || state.reason === "not_verified" || state.reason === "subject_not_member") return null;

  if (done || state.reason === "already_reviewed") {
    return (
      <Card className="space-y-2">
        <p className="font-semibold">Thanks for your review ✓</p>
        <p className="text-sm text-muted">It becomes public when {state.subjectName} reviews too, or after 14 days — so every review is honest.</p>
        {state.mine && <Stars value={state.mine.rating} />}
        {afterSubmit}
      </Card>
    );
  }

  async function submit() {
    if (!rating) return setError("Choose a star rating.");
    if (askName && name.trim().length < 2) return setError("Enter your name.");
    setBusy(true);
    setError(null);
    try {
      await api(endpoint, { auth, body: { rating, tags, text, ...(askName ? { name: name.trim() } : {}) } });
      setDone(true);
    } catch (e) {
      setError(e instanceof ApiClientError ? e.message : "Could not save your review. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const shown = hover || rating;
  return (
    <Card className="space-y-4">
      <div>
        <p className="font-semibold">How was working with {state.subjectName}?</p>
        <p className="text-sm text-muted">Verified review — only possible because both sides confirmed this collaboration.</p>
      </div>
      <div className="flex items-center gap-3">
        <div role="radiogroup" aria-label="Rating" className="flex" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              onMouseEnter={() => setHover(n)}
              onClick={() => setRating(n)}
              className={cx("px-0.5 text-3xl leading-none transition-transform hover:scale-110", n <= shown ? "text-amber-500" : "text-slate-300")}
            >
              ★
            </button>
          ))}
        </div>
        <span className="text-sm text-muted" aria-live="polite">{LABELS[shown]}</span>
      </div>
      <div className="flex flex-wrap gap-2" aria-label="What stood out (up to 3)">
        {REVIEW_TAGS[state.subject].map((t) => {
          const on = tags.includes(t);
          return (
            <button
              key={t}
              type="button"
              aria-pressed={on}
              onClick={() => setTags((p) => (on ? p.filter((x) => x !== t) : p.length < 3 ? [...p, t] : p))}
              className={cx("rounded-full px-3 py-1.5 text-sm ring-1 transition", on ? "bg-ink text-white ring-ink" : "bg-white ring-line hover:ring-slate-300")}
            >
              {t}
            </button>
          );
        })}
      </div>
      <div>
        <label htmlFor="review-text" className="text-sm font-medium">A sentence for others (optional)</label>
        <textarea
          id="review-text"
          rows={3}
          maxLength={REVIEW_TEXT_MAX}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What made this collaboration work?"
          className="mt-1.5 block w-full rounded-xl bg-white px-3.5 py-2.5 text-[15px] ring-1 ring-line focus:ring-2 focus:ring-brand focus:outline-none"
        />
        <p className="mt-1 text-right text-xs text-muted">{text.length}/{REVIEW_TEXT_MAX}</p>
      </div>
      {askName && <Input aria-label="Your name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={80} />}
      {error && <Notice tone="error">{error}</Notice>}
      <Button onClick={submit} loading={busy}>Post verified review</Button>
    </Card>
  );
}
