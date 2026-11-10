import { describe, expect, it } from "vitest";
import { autoReminderDue, isStopMessage, maskPhone, templateParam, toWaId } from "@/lib/whatsapp";
import { publicDealActionSchema } from "@/lib/schemas";

describe("whatsapp helpers", () => {
  it("normalises and masks numbers", () => {
    expect(toWaId("98765 43210")).toBe("919876543210");
    expect(toWaId("+44 7700 900123")).toBe("447700900123");
    expect(toWaId("123")).toBeNull();
    expect(maskPhone("919876543210")).toBe("+91 •••••• 3210");
  });
  it("recognises STOP in English and Hindi", () => {
    for (const t of ["STOP", " stop ", "Unsubscribe", "band karo", "बंद करो"]) expect(isStopMessage(t)).toBe(true);
    expect(isStopMessage("stop by tomorrow pls")).toBe(false);
  });
  it("sanitises template params per Meta rules", () => {
    expect(templateParam("a\nb\t\tc     d")).toBe("a b c   d");
    expect(templateParam("")).toBe("-");
    expect(templateParam("x".repeat(500)).length).toBe(120);
  });
});

describe("auto reminder policy", () => {
  const base = { enabled: true, optedIn: true, balance: 6000, paymentDueDate: "2026-11-05", today: "2026-11-10", sent: 0, lastSentOn: null };
  it("sends only when overdue, opted in, enabled and money is owed", () => {
    expect(autoReminderDue(base)).toBe(true);
    expect(autoReminderDue({ ...base, enabled: false })).toBe(false);
    expect(autoReminderDue({ ...base, optedIn: false })).toBe(false);
    expect(autoReminderDue({ ...base, balance: 0 })).toBe(false);
    expect(autoReminderDue({ ...base, paymentDueDate: "2026-11-10" })).toBe(false);
    expect(autoReminderDue({ ...base, paymentDueDate: "" })).toBe(false);
  });
  it("waits 3 days between reminders and stops after 3", () => {
    expect(autoReminderDue({ ...base, sent: 1, lastSentOn: "2026-11-08" })).toBe(false);
    expect(autoReminderDue({ ...base, sent: 1, lastSentOn: "2026-11-07" })).toBe(true);
    expect(autoReminderDue({ ...base, sent: 3, lastSentOn: "2026-10-01" })).toBe(false);
  });
});

describe("deal link actions", () => {
  it("requires a phone for opt-in and nothing for opt-out", () => {
    expect(publicDealActionSchema.safeParse({ action: "whatsapp_optin", name: "Aman" }).success).toBe(false);
    expect(publicDealActionSchema.safeParse({ action: "whatsapp_optin", name: "Aman", phone: "98765 43210" }).success).toBe(true);
    expect(publicDealActionSchema.safeParse({ action: "whatsapp_optout" }).success).toBe(true);
  });
});
