import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { Spinner } from "@/components/ui";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <LoginForm />
    </Suspense>
  );
}
