"use client";

import { clientAuth } from "@/lib/firebase/client";

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

type Options = { method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; body?: unknown; auth?: boolean; signal?: AbortSignal };

/** Typed fetch for our own API. Attaches a fresh Firebase ID token when `auth` is true (default). */
export async function api<T>(path: string, opts: Options = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.auth !== false) {
    const user = clientAuth()?.currentUser;
    if (!user) throw new ApiClientError(401, "unauthenticated", "Please sign in");
    headers.Authorization = `Bearer ${await user.getIdToken()}`;
  }
  let res: Response;
  try {
    res = await fetch(path, {
      method: opts.method ?? (opts.body !== undefined ? "POST" : "GET"),
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
      cache: "no-store",
    });
  } catch {
    throw new ApiClientError(0, "network_error", "You appear to be offline. Check your connection and try again.");
  }
  const data = (await res.json().catch(() => null)) as { error?: { code: string; message: string; fields?: Record<string, string> } } | null;
  if (!res.ok) {
    if (!data?.error) {
      // Not our JSON: the hosting platform returned its own error page (the server function crashed or timed out).
      const id = res.headers.get("x-vercel-id")?.split("::").pop();
      throw new ApiClientError(res.status, `server_${res.status}`, `The server hit a problem (${res.status}${id ? `, id ${id}` : ""}). Please try again shortly.`);
    }
    throw new ApiClientError(res.status, data.error.code, data.error.message, data.error.fields ?? {});
  }
  return data as T;
}

/** Download an authenticated file response (e.g. data export). */
export async function downloadAuthed(path: string, filename: string): Promise<void> {
  const user = clientAuth()?.currentUser;
  if (!user) throw new ApiClientError(401, "unauthenticated", "Please sign in");
  const res = await fetch(path, { headers: { Authorization: `Bearer ${await user.getIdToken()}` }, cache: "no-store" });
  if (!res.ok) throw new ApiClientError(res.status, "download_failed", "Download failed");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
