import "server-only";
import type { Timestamp } from "firebase-admin/firestore";
import type { CampaignInput } from "@/lib/schemas";

export type CampaignDoc = Required<Omit<CampaignInput, "status">> & {
  brandUid: string;
  brandName: string;
  brandHandle: string;
  brandVerified: boolean;
  status: "draft" | "open" | "closed";
  applicationsCount: number;
  acceptedCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  schemaVersion: number;
};

export function idOk(id: string): boolean {
  return /^[A-Za-z0-9_]{1,160}$/.test(id);
}
