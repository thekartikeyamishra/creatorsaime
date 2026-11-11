import "server-only";
import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { ServiceUnavailableError } from "@/lib/firebase/admin";
import { site } from "@/lib/config";
import { classifyFirebaseError } from "./firebase-errors";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const MAX_BODY_BYTES = 20_000;

export function json<T>(data: T, init?: number | ResponseInit): NextResponse {
  const responseInit = typeof init === "number" ? { status: init } : init;
  return NextResponse.json(data, responseInit);
}

/** Turns zod's technical defaults into messages fit for end users. Custom messages pass through. */
function friendlyMessage(issue: ZodError["issues"][number]): string {
  if (issue.code === "invalid_type") {
    return /received undefined|received null/.test(issue.message) ? "This field is required" : "Invalid value";
  }
  if (issue.code === "invalid_value") return issue.message.startsWith("Invalid option") ? "Choose one of the options" : issue.message;
  return issue.message;
}

function errorResponse(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return json({ error: { code: err.code, message: err.message } }, err.status);
  }
  if (err instanceof ZodError) {
    const fields: Record<string, string> = {};
    for (const issue of err.issues) {
      const key = issue.path.join(".") || "_";
      if (!fields[key]) fields[key] = friendlyMessage(issue);
    }
    return json({ error: { code: "validation_failed", message: "Please check the highlighted fields.", fields } }, 400);
  }
  if (err instanceof ServiceUnavailableError) {
    console.error("[api] service unavailable:", err.message);
    return json({ error: { code: "service_unavailable", message: "Service is temporarily unavailable. Please try again shortly." } }, 503);
  }
  const fb = classifyFirebaseError(err);
  if (fb) {
    console.error(`[api] firebase problem: ${fb.code} — ${fb.hint}`, err);
    return json({ error: { code: fb.code, message: "Service is temporarily unavailable. Please try again shortly." } }, 503);
  }
  const ref = Math.random().toString(36).slice(2, 10);
  console.error(`[api] unhandled error ref=${ref}:`, err);
  return json({ error: { code: "internal_error", message: `Something went wrong. Please try again. (ref ${ref})`, ref } }, 500);
}

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

/** Wraps a route handler with uniform error handling. Never leaks stack traces. */
export function route<C = unknown>(handler: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      return errorResponse(err);
    }
  };
}

/** Reads and validates a JSON body with a hard size cap. */
export async function readJson<T>(req: Request, schema: ZodType<T>): Promise<T> {
  const ct = req.headers.get("content-type") || "";
  if (!ct.toLowerCase().includes("application/json")) {
    throw new ApiError(415, "unsupported_media_type", "Expected application/json");
  }
  const raw = await req.text();
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
    throw new ApiError(413, "payload_too_large", "Request is too large");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ApiError(400, "invalid_json", "Malformed JSON");
  }
  return schema.parse(parsed);
}

/**
 * CSRF defence for cookie-less public POSTs: require a same-origin Origin header.
 * Authenticated routes use Bearer tokens (not ambient credentials), so they are not CSRF-able,
 * but we apply this check to all mutating routes for defence in depth.
 */
export function assertSameOrigin(req: Request): void {
  const origin = req.headers.get("origin");
  if (!origin) throw new ApiError(403, "forbidden_origin", "Missing origin");
  const allowed = new Set([site.url]);
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  if (host) allowed.add(`${proto}://${host}`);
  if (process.env.NODE_ENV !== "production" && host) allowed.add(`http://${host}`);
  if (!allowed.has(origin)) throw new ApiError(403, "forbidden_origin", "Cross-origin request blocked");
}

/** Best-effort client IP. Relies on the hosting platform's proxy setting x-forwarded-for. */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") || "unknown";
}
