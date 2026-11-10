import { Suspense } from "react";
import { SignupFlow } from "@/components/signup-flow";
import { Spinner } from "@/components/ui";

export const metadata = { title: "Accept your invite" };

export default function SignupPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <SignupFlow />
    </Suspense>
  );
}
