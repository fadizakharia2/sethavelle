/**
 * Request/response hardening shared by the worker entry and custom endpoints.
 */

const PRODUCTION = () => process.env.NODE_ENV === "production";

/** Baseline headers for every response. CSP is added per document. */
export function applySecurityHeaders(headers: Headers, { production = PRODUCTION() } = {}) {
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Cross-Origin-Opener-Policy", "same-origin-allow-popups");
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), usb=(), browsing-topics=(), interest-cohort=()",
  );
  if (production) {
    headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  headers.delete("X-Powered-By");
}

/** Paths whose responses always contain customer-specific data. */
export function isPrivatePath(pathname: string): boolean {
  return pathname === "/account" || pathname.startsWith("/account/") || pathname.startsWith("/api/");
}

/** Never let a shared cache store a personalized response. */
export function applyPrivateCaching(headers: Headers) {
  headers.set("Cache-Control", "private, no-store, max-age=0");
  headers.set("Vary", appendVary(headers.get("Vary"), "Cookie"));
}

function appendVary(existing: string | null, value: string) {
  if (!existing) return value;
  const parts = existing.split(",").map((part) => part.trim().toLowerCase());
  return parts.includes(value.toLowerCase()) ? existing : `${existing}, ${value}`;
}

/**
 * Returns a same-origin relative path, or the fallback. Rejects absolute URLs,
 * protocol-relative URLs (`//evil.example`), backslash tricks (`/\evil`),
 * encoded variants and control characters — the classic open-redirect vectors.
 */
export function safeRedirectPath(target: unknown, fallback = "/"): string {
  if (typeof target !== "string") return fallback;
  const value = target.trim();
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  // eslint-disable-next-line no-control-regex -- rejecting control characters is the point
  if (/[\u0000-\u001f\u007f\\]/.test(value)) return fallback;
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return fallback;
  }
  // eslint-disable-next-line no-control-regex -- rejecting control characters is the point
  if (decoded.startsWith("//") || decoded.startsWith("/\\") || /[\u0000-\u001f\u007f]/.test(decoded)) {
    return fallback;
  }
  try {
    const resolved = new URL(value, "https://placeholder.invalid");
    if (resolved.origin !== "https://placeholder.invalid") return fallback;
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return fallback;
  }
}

/**
 * CSRF defense for state-changing custom endpoints: the request must come
 * from our own origin. Uses `Origin` first and falls back to
 * `Sec-Fetch-Site`. Requests with neither header are rejected.
 */
export function isSameOriginRequest(request: Request): boolean {
  const url = new URL(request.url);
  const origin = request.headers.get("Origin");
  if (origin) return origin === url.origin;
  const site = request.headers.get("Sec-Fetch-Site");
  return site === "same-origin";
}

/** Coarse client key for abuse limits. Never logged. */
export function clientKey(request: Request): string {
  return (
    request.headers.get("oxygen-buyer-ip") ??
    (PRODUCTION() ? null : request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()) ??
    "anonymous"
  );
}

type Bucket = { count: number; resetAt: number };

/**
 * Fixed-window limiter. State is per worker isolate, so it limits bursts from
 * a single client but is not a global quota — pair with Oxygen/Cloudflare
 * edge rules or a bot challenge for real abuse protection (docs/SECURITY.md).
 */
export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const buckets = new Map<string, Bucket>();
  return {
    check(key: string, now = Date.now()): { allowed: boolean; retryAfterSeconds: number } {
      if (buckets.size > 5000) {
        for (const [k, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(k);
      }
      const bucket = buckets.get(key);
      if (!bucket || bucket.resetAt <= now) {
        buckets.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, retryAfterSeconds: 0 };
      }
      bucket.count += 1;
      return {
        allowed: bucket.count <= limit,
        retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
      };
    },
  };
}

/** Removes anything that looks like a credential from text before logging. */
export function redactForLog(message: string): string {
  return message
    .replace(/(shcat_|shpat_|shpca_|shpss_|atkn_)[A-Za-z0-9_-]+/g, "$1[redacted]")
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[jwt-redacted]")
    .replace(/([?&](code|state|token|access_token|refresh_token|id_token)=)[^&\s]+/gi, "$1[redacted]")
    .replace(/(authorization:\s*)(bearer\s+)?\S+/gi, "$1[redacted]");
}

export function logServerError(scope: string, error: unknown) {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  console.error(`[${scope}] ${redactForLog(message)}`);
}
