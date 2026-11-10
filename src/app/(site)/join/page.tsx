import { Suspense } from "react";
import { JoinForm } from "@/components/join-form";
import { Spinner } from "@/components/ui";

export const metadata = {
  title: "Request an invite",
  description: "Request an invite to CreatorsAI as a creator, brand or creative professional and get a personalised preview in seconds.",
  alternates: { canonical: "/join" },
};

export default function JoinPage() {
  return (
    <section className="container-page max-w-3xl py-14 sm:py-20">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Request your invite</h1>
      <p className="mt-3 text-muted">Under a minute. You&apos;ll see a personalised, honest preview straight away — no fake scores.</p>
      <div className="mt-10">
        <Suspense fallback={<Spinner />}>
          <JoinForm />
        </Suspense>
      </div>
    </section>
  );
}
