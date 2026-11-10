"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/client/auth-context";
import { NotificationBell } from "./notification-bell";
import { LanguageSwitcher, useLocale } from "./locale-provider";
import { api } from "@/lib/client/api";
import type { MessageKey } from "@/lib/i18n";
import { Badge, Button, Logo, Notice, Spinner, cx } from "./ui";

type NavItem = { href: string; label: string };

export function AppShell({ nav, requireAdmin, children }: { nav: NavItem[]; requireAdmin?: boolean; children: ReactNode }) {
  const { configured, loading, user, me, meError, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLocale();
  const NAV_KEYS: Record<string, MessageKey> = {
    "/dashboard": "nav.overview", "/dashboard/deals": "nav.deals", "/dashboard/campaigns": "nav.campaigns", "/dashboard/pods": "nav.pods",
    "/dashboard/rates": "nav.rates", "/dashboard/plan": "nav.plan", "/dashboard/billing": "nav.billing", "/dashboard/profile": "nav.profile",
    "/dashboard/verification": "nav.verification", "/dashboard/account": "nav.account", "/admin": "nav.admin",
  };
  const label = (i: NavItem) => (!requireAdmin && NAV_KEYS[i.href] ? t(NAV_KEYS[i.href]!) : i.label);

  useEffect(() => {
    if (configured && !loading && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [configured, loading, user, pathname, router]);

  if (!configured) {
    return (
      <div className="container-page py-20">
        <Notice tone="warn">Firebase is not configured. Copy .env.example to .env.local and fill in your project settings.</Notice>
      </div>
    );
  }
  if (loading || !user) return <Spinner />;
  if (meError && !me) {
    return (
      <div className="container-page py-20">
        <Notice tone="error">{meError}</Notice>
      </div>
    );
  }
  if (requireAdmin && !me?.isAdmin) {
    return (
      <div className="container-page py-20">
        <Notice tone="error">You don&apos;t have access to this area.</Notice>
      </div>
    );
  }

  const items = me?.isAdmin && !requireAdmin ? [...nav, { href: "/admin", label: "Admin" }] : nav;

  return (
    <div className="min-h-dvh bg-paper print:bg-white">
      <header className="border-b border-line bg-white print:hidden">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <Link href={requireAdmin ? "/admin" : "/dashboard"} aria-label="Dashboard home" className="flex items-center gap-2">
            <Logo />
            {requireAdmin && <Badge tone="amber">Admin</Badge>}
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher onChange={(l) => me?.member && api("/api/account/preferences", { method: "PUT", body: { language: l } }).catch(() => undefined)} />
            {me?.member && <NotificationBell />}
            <span className="hidden max-w-[16rem] truncate text-sm text-muted sm:inline">{user.email}</span>
            <Button
              variant="ghost"
              className="!px-3 !py-2"
              onClick={async () => {
                await signOut();
                router.replace("/login");
              }}
            >
              {t("common.signOut")}
            </Button>
          </div>
        </div>
        {(me?.member || requireAdmin) && (
          <nav aria-label="Dashboard" className="container-page -mb-px flex gap-1 overflow-x-auto">
            {items.map((i) => {
              const active = i.href === pathname || (i.href !== "/dashboard" && i.href !== "/admin" && pathname.startsWith(i.href));
              return (
                <Link
                  key={i.href}
                  href={i.href}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium",
                    active ? "border-brand text-ink" : "border-transparent text-muted hover:text-ink",
                  )}
                >
                  {label(i)}
                </Link>
              );
            })}
          </nav>
        )}
      </header>
      <main id="main" className="container-page py-8 sm:py-10">
        {children}
      </main>
    </div>
  );
}
