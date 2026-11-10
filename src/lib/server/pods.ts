import "server-only";
import type { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type { PodMember } from "@/lib/pods";
import { C } from "./collections";
import { ApiError } from "./http";

export type PodDoc = {
  name: string;
  city: string;
  description: string;
  categories: string[];
  leadUid: string;
  members: PodMember[];
  memberUids: string[];
  activeUids: string[];
  isPublic: boolean;
  status: "active" | "archived";
  createdAt: Timestamp;
  updatedAt: Timestamp;
  schemaVersion: number;
};

export function podRef(id: string) {
  if (!/^[A-Za-z0-9]{1,128}$/.test(id)) throw new ApiError(404, "not_found", "Pod not found");
  return adminDb().collection(C.pods).doc(id);
}

export function indexes(members: PodMember[]): { memberUids: string[]; activeUids: string[] } {
  return { memberUids: members.map((m) => m.uid), activeUids: members.filter((m) => m.status === "active").map((m) => m.uid) };
}
