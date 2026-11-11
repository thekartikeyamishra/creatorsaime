import { Suspense } from "react";
import { SignupFlow } from "@/components/signup-flow";
import { Spinner } from "@/components/ui";

export const metadata = { title: "Create your free account", description: "Create a free CreatorsAI account: Deal Desk, payment reminders and a verified Trust Passport.", robots: { index: false, follow: true } };

export default function SignupPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <SignupFlow />
    </Suspense>
  );
}
