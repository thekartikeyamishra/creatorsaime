"use client";

export default function GlobalSegmentError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="grid min-h-dvh place-items-center bg-paper px-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="mt-3 text-muted">Please try again. If it keeps happening, contact support.</p>
        <button onClick={reset} className="mt-6 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white">Try again</button>
      </div>
    </main>
  );
}
