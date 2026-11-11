import { describe, expect, it } from "vitest";
import { authErrorMessage, safeNext } from "@/components/auth-errors";

describe("authErrorMessage", () => {
  it("does not reveal whether an account exists", () => {
    for (const code of ["auth/invalid-credential", "auth/user-not-found", "auth/wrong-password"]) expect(authErrorMessage({ code })).toBe("Email or password is incorrect.");
  });
  it("explains setup problems instead of a generic error", () => {
    expect(authErrorMessage({ code: "auth/operation-not-allowed" })).toMatch(/Email\/Password/);
    expect(authErrorMessage({ code: "auth/configuration-not-found" })).toMatch(/Get started/);
    expect(authErrorMessage({ code: "auth/unauthorized-domain" })).toMatch(/Authorized domains/);
    expect(authErrorMessage({ code: "auth/api-key-not-valid.-please-pass-a-valid-api-key." })).toMatch(/API key/);
  });
  it("falls back safely", () => {
    expect(authErrorMessage(new Error("x"))).toBe("Something went wrong. Please try again.");
  });
});

describe("safeNext", () => {
  it("blocks open redirects", () => {
    expect(safeNext("//evil.com")).toBe("/dashboard");
    expect(safeNext("https://evil.com")).toBe("/dashboard");
    expect(safeNext("/dashboard/deals")).toBe("/dashboard/deals");
  });
});
