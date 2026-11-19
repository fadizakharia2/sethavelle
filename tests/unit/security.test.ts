import { describe, expect, it, vi } from "vitest";

import {
  applyPrivateCaching,
  applySecurityHeaders,
  createRateLimiter,
  isPrivatePath,
  isSameOriginRequest,
  logServerError,
  redactForLog,
  safeRedirectPath,
} from "~/lib/server/security.server";

describe("safeRedirectPath (open redirect defense)", () => {
  it.each([
    ["/account/orders?page=2#top", "/account/orders?page=2#top"],
    ["/account", "/account"],
  ])("keeps same-origin path %s", (input, expected) => {
    expect(safeRedirectPath(input)).toBe(expected);
  });

  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "\\\\evil.example",
    "/%2F%2Fevil.example",
    "/%5Cevil.example",
    "javascript:alert(1)",
    "/foo\nbar",
    "/%0d%0aSet-Cookie:x=1",
    "  //evil.example",
    "",
    "relative/path",
  ])("rejects %j", (input) => {
    expect(safeRedirectPath(input, "/fallback")).toBe("/fallback");
  });

  it("rejects non-string input", () => {
    expect(safeRedirectPath(undefined)).toBe("/");
    expect(safeRedirectPath(["/a"])).toBe("/");
  });
});

describe("isSameOriginRequest (CSRF)", () => {
  const url = "https://sethavelle.example/api/newsletter";
  it("accepts a matching Origin", () => {
    expect(
      isSameOriginRequest(
        new Request(url, { method: "POST", headers: { Origin: "https://sethavelle.example" } }),
      ),
    ).toBe(true);
  });
  it("rejects a foreign Origin even if Sec-Fetch-Site lies", () => {
    expect(
      isSameOriginRequest(
        new Request(url, {
          method: "POST",
          headers: { Origin: "https://evil.example", "Sec-Fetch-Site": "same-origin" },
        }),
      ),
    ).toBe(false);
  });
  it("falls back to Sec-Fetch-Site and rejects headerless requests", () => {
    expect(
      isSameOriginRequest(new Request(url, { method: "POST", headers: { "Sec-Fetch-Site": "same-origin" } })),
    ).toBe(true);
    expect(
      isSameOriginRequest(new Request(url, { method: "POST", headers: { "Sec-Fetch-Site": "cross-site" } })),
    ).toBe(false);
    expect(isSameOriginRequest(new Request(url, { method: "POST" }))).toBe(false);
  });
});

describe("headers", () => {
  it("applies baseline security headers, HSTS only in production", () => {
    const dev = new Headers();
    applySecurityHeaders(dev, { production: false });
    expect(dev.get("X-Content-Type-Options")).toBe("nosniff");
    expect(dev.get("X-Frame-Options")).toBe("DENY");
    expect(dev.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(dev.get("Strict-Transport-Security")).toBeNull();
    const prod = new Headers();
    applySecurityHeaders(prod, { production: true });
    expect(prod.get("Strict-Transport-Security")).toMatch(/max-age=\d+/);
  });

  it("marks account and API paths private and never publicly cacheable", () => {
    expect(isPrivatePath("/account")).toBe(true);
    expect(isPrivatePath("/account/orders/1")).toBe(true);
    expect(isPrivatePath("/api/newsletter")).toBe(true);
    expect(isPrivatePath("/accounting")).toBe(false);
    expect(isPrivatePath("/products/darkness")).toBe(false);

    const headers = new Headers({ "Cache-Control": "public, max-age=3600", Vary: "Accept-Encoding" });
    applyPrivateCaching(headers);
    expect(headers.get("Cache-Control")).toBe("private, no-store, max-age=0");
    expect(headers.get("Vary")).toBe("Accept-Encoding, Cookie");
  });
});

describe("rate limiter", () => {
  it("allows up to the limit per window, then blocks with Retry-After", () => {
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000 });
    expect(limiter.check("k", 0).allowed).toBe(true);
    expect(limiter.check("k", 1).allowed).toBe(true);
    const blocked = limiter.check("k", 2);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(60);
    expect(limiter.check("other", 2).allowed).toBe(true);
    expect(limiter.check("k", 60_001).allowed).toBe(true);
  });
});

describe("log redaction", () => {
  it("removes tokens, JWTs, OAuth params and auth headers", () => {
    const line = redactForLog(
      "failed shcat_ABCdef123 shpat_zzz eyJhbGciOi.eyJzdWIiOi.c2lnbmF0dXJl /authorize?code=abc&state=xyz Authorization: Bearer secret-token",
    );
    for (const leaked of ["ABCdef123", "shpat_zzz", "eyJhbGciOi", "code=abc", "state=xyz", "secret-token"]) {
      expect(line).not.toContain(leaked);
    }
  });

  it("logServerError never prints stacks or raw tokens", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("upstream said shcat_secretvalue");
    logServerError("test", error);
    const printed = String(spy.mock.calls[0]?.[0]);
    expect(printed).not.toContain("secretvalue");
    expect(printed).not.toContain("at ");
  });
});
