import { AppShell } from "@/components/app-shell";

export const metadata = { title: "Dashboard" };

const nav = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/deals", label: "Deal Desk" },
  { href: "/dashboard/campaigns", label: "Campaigns" },
  { href: "/dashboard/pods", label: "Pods" },
  { href: "/dashboard/rates", label: "Rate Index" },
  { href: "/dashboard/profile", label: "Profile" },
  { href: "/dashboard/verification", label: "Verification" },
  { href: "/dashboard/plan", label: "Plan" },
  { href: "/dashboard/referrals", label: "Invite & earn" },
  { href: "/dashboard/billing", label: "Billing details" },
  { href: "/dashboard/account", label: "Account" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AppShell nav={nav}>{children}</AppShell>;
}
