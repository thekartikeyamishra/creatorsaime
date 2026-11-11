import { describe, expect, it } from "vitest";
import { classifyFirebaseError } from "@/lib/server/firebase-errors";

describe("classifyFirebaseError", () => {
  it("detects a missing Firestore database", () => {
    expect(classifyFirebaseError({ code: 5, details: "The database (default) does not exist for project creatorsaime" })?.code).toBe("firestore_database_missing");
  });
  it("detects disabled API, permission and credential problems", () => {
    expect(classifyFirebaseError({ code: 7, message: "7 PERMISSION_DENIED: Cloud Firestore API has not been used in project 123 before or it is disabled" })?.code).toBe("firestore_api_disabled");
    expect(classifyFirebaseError({ code: 7, message: "7 PERMISSION_DENIED: Missing or insufficient permissions." })?.code).toBe("firestore_permission_denied");
    expect(classifyFirebaseError({ code: 16, message: "16 UNAUTHENTICATED: invalid_grant" })?.code).toBe("admin_credentials_rejected");
    expect(classifyFirebaseError(new Error("Failed to parse private key: Error: Invalid PEM formatted message."))?.code).toBe("admin_key_malformed");
  });
  it("ignores unrelated errors", () => {
    expect(classifyFirebaseError(new Error("boom"))).toBeNull();
    expect(classifyFirebaseError(null)).toBeNull();
  });
});
