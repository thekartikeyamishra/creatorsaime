import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, intro, children }: { eyebrow?: string; title: string; intro?: ReactNode; children?: ReactNode }) {
  return (
    <section className="grid-glow bg-ink text-white">
      <div className="container-page py-16 sm:py-24">
        {eyebrow && <p className="text-sm font-semibold uppercase tracking-wider text-teal">{eyebrow}</p>}
        <h1 className="text-balance mt-3 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
        {intro && <p className="mt-5 max-w-2xl text-lg text-slate-300">{intro}</p>}
        {children && <div className="mt-8 flex flex-col gap-3 sm:flex-row">{children}</div>}
      </div>
    </section>
  );
}

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <section className="container-page py-14 sm:py-20">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-muted">Last updated: {updated}</p>
      <div className="prose-legal mt-8">{children}</div>
    </section>
  );
}
