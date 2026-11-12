import "server-only";
import type { Role } from "@/lib/config";

/** Canonical collection names. Keep in sync with firestore.rules and docs/DATABASE.md. */
export const C = {
  users: "users",
  creatorProfiles: "creatorProfiles",
  brandProfiles: "brandProfiles",
  handles: "handles",
  socialAccounts: "socialAccounts",
  brandVerifications: "brandVerifications",
  trustSignals: "trustSignals",
  waitlist: "waitlist",
  referralCodes: "referralCodes",
  invites: "invites",
  consentRecords: "consentRecords",
  dataRequests: "dataRequests",
  auditLogs: "auditLogs",
  rateLimits: "rateLimits",
  // Stage 2
  campaigns: "campaigns",
  applications: "applications",
  deals: "deals",
  dealLinks: "dealLinks",
  trackingLinks: "trackingLinks",
  clickDedupe: "clickDedupe",
  billingProfiles: "billingProfiles",
  // v0.3
  orders: "orders",
  subscriptions: "subscriptions",
  managedRequests: "managedRequests",
  counters: "counters",
  notifications: "notifications",
  // v0.4 moats
  reliability: "reliability",
  benchmarks: "benchmarks",
  // v0.5
  pods: "pods",
  // v0.6
  whatsappMessages: "whatsappMessages",
  // v0.13 growth loops
  memberRefCodes: "memberRefCodes",
  referrals: "referrals",
  referralStats: "referralStats",
  reviews: "reviews",
} as const;

export function profileCollection(role: Role): string {
  return role === "brand" ? C.brandProfiles : C.creatorProfiles;
}
