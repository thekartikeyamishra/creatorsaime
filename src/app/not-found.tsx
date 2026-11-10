import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center bg-paper px-6 text-center">
      <div>
        <p className="text-sm font-semibold text-brand">404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">This page doesn&apos;t exist</h1>
        <p className="mt-3 text-muted">It may have moved, or the profile isn&apos;t public.</p>
        <Link href="/" className="mt-6 inline-block rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-white">Go home</Link>
      </div>
    </main>
  );
}
