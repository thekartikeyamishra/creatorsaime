import type { Metadata } from "next";
import { AuthProvider } from "@/lib/client/auth-context";

// Authenticated and auth-flow pages are never indexed.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AppGroupLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
