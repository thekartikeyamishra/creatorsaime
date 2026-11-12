import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { parseServiceAccount } from "@/lib/firebase/admin";

const sa = { project_id: "creatorsaime", client_email: "x@y.iam.gserviceaccount.com", private_key: "-----BEGIN PRIVATE KEY-----\nABC\n-----END PRIVATE KEY-----\n" };

describe("parseServiceAccount", () => {
  it("reads base64 JSON (recommended)", () => {
    expect(parseServiceAccount(Buffer.from(JSON.stringify(sa)).toString("base64"))?.project_id).toBe("creatorsaime");
  });
  it("accepts raw JSON and wrapping quotes", () => {
    expect(parseServiceAccount(`"${Buffer.from(JSON.stringify(sa)).toString("base64")}"`)?.client_email).toBe(sa.client_email);
    expect(parseServiceAccount(JSON.stringify(sa))?.project_id).toBe("creatorsaime");
  });
  it("repairs literal \\n in the private key", () => {
    const broken = JSON.stringify({ ...sa, private_key: sa.private_key.replace(/\n/g, "\\n") });
    expect(parseServiceAccount(broken)?.private_key).toBe(sa.private_key);
  });
  it("returns null for garbage", () => {
    expect(parseServiceAccount("not-base64-json")).toBeNull();
  });
});
