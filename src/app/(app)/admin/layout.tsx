import { AppShell } from "@/components/app-shell";

export const metadata = { title: "Admin" };

const nav = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/waitlist", label: "Waitlist" },
  { href: "/admin/verifications", label: "Verifications" },
  { href: "/admin/users", label: "Members" },
  { href: "/admin/requests", label: "Data requests" },
  { href: "/admin/audit", label: "Audit log" },
  { href: "/dashboard", label: "My dashboard" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AppShell nav={nav} requireAdmin>{children}</AppShell>;
}
