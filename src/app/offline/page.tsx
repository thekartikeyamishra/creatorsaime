export const metadata = { title: "You're offline", robots: { index: false } };

export default function OfflinePage() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center bg-ink px-6 text-center text-white">
      <div>
        <h1 className="text-2xl font-semibold">You&apos;re offline</h1>
        <p className="mt-3 text-slate-300">Check your connection. Your data is safe — nothing was lost.</p>
      </div>
    </main>
  );
}
