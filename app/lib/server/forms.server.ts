import type { z } from "zod";

import type { FormResult } from "~/lib/forms";
import { zodFieldErrors } from "~/lib/forms";
import type { WebhookTarget } from "~/lib/server/config.server";
import {
  clientKey,
  type createRateLimiter,
  isSameOriginRequest,
  logServerError,
} from "~/lib/server/security.server";

const MAX_BODY_BYTES = 16 * 1024;

/**
 * Shared pipeline for custom form endpoints:
 * method check → same-origin (CSRF) → body size → rate limit → Zod →
 * honeypot → duplicate suppression → signed webhook delivery.
 * Responses are generic; details go to (redacted) logs only.
 */
export async function handleFormPost<S extends z.ZodType<Record<string, unknown>>>({
  request,
  schema,
  limiter,
  dedupe,
  webhook,
  kind,
  successMessage,
}: {
  request: Request;
  schema: S;
  limiter: ReturnType<typeof createRateLimiter>;
  dedupe: ReturnType<typeof createDedupe>;
  webhook: WebhookTarget | null;
  kind: "newsletter" | "contact";
  successMessage: string;
}): Promise<{ status: number; body: FormResult; headers?: HeadersInit }> {
  if (request.method !== "POST") {
    return { status: 405, body: { ok: false, message: "Method not allowed." }, headers: { Allow: "POST" } };
  }
  if (!isSameOriginRequest(request)) {
    return { status: 403, body: { ok: false, message: "This request could not be verified." } };
  }
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > MAX_BODY_BYTES) {
    return { status: 413, body: { ok: false, message: "That submission is too large." } };
  }

  const key = `${kind}:${clientKey(request)}`;
  const limit = limiter.check(key);
  if (!limit.allowed) {
    return {
      status: 429,
      body: { ok: false, message: "Too many attempts. Please wait a moment and try again." },
      headers: { "Retry-After": String(limit.retryAfterSeconds) },
    };
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return { status: 400, body: { ok: false, message: "We couldn't read that submission." } };
  }
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const fieldErrors = zodFieldErrors(parsed.error);
    if (fieldErrors.website) {
      // Honeypot tripped: pretend success so bots learn nothing.
      return { status: 200, body: { ok: true, message: successMessage } };
    }
    return { status: 422, body: { ok: false, message: "Please check the highlighted fields.", fieldErrors } };
  }

  if (!webhook) {
    return {
      status: 503,
      body: {
        ok: false,
        message:
          kind === "newsletter"
            ? "Our correspondence list is not open yet. Please return soon."
            : "Our message desk is not open yet. Please return soon.",
      },
    };
  }

  const data = parsed.data as Record<string, unknown>;
  const fingerprint = await sha256(`${kind}:${JSON.stringify(data)}`);
  if (dedupe.seen(fingerprint)) {
    // Duplicate (double click, retry): idempotent success, no second delivery.
    return { status: 200, body: { ok: true, message: successMessage } };
  }

  // Claim the fingerprint before delivery so concurrent duplicates are dropped.
  dedupe.remember(fingerprint);
  try {
    const { website: _honeypot, ...payload } = data;
    const body = JSON.stringify({ type: kind, submittedAt: new Date().toISOString(), data: payload });
    const response = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sethavelle-Signature": await hmacSha256(webhook.secret, body),
      },
      body,
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`${kind} webhook responded ${response.status}`);
    return { status: 200, body: { ok: true, message: successMessage } };
  } catch (error) {
    dedupe.forget(fingerprint);
    logServerError(`${kind}-webhook`, error);
    return { status: 502, body: { ok: false, message: "Something went wrong. Please try again later." } };
  }
}

export function createDedupe(ttlMs = 10 * 60 * 1000) {
  const seen = new Map<string, number>();
  return {
    seen(key: string, now = Date.now()) {
      const at = seen.get(key);
      return at !== undefined && now - at < ttlMs;
    },
    forget(key: string) {
      seen.delete(key);
    },
    remember(key: string, now = Date.now()) {
      if (seen.size > 5000) seen.clear();
      seen.set(key, now);
    },
  };
}

async function sha256(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hmacSha256(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
