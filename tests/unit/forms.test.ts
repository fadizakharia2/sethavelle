import { afterEach, describe, expect, it, vi } from "vitest";

import { contactSchema, newsletterSchema } from "~/lib/forms";
import { createDedupe, handleFormPost, hmacSha256 } from "~/lib/server/forms.server";
import { createRateLimiter } from "~/lib/server/security.server";

const ORIGIN = "https://sethavelle.example";
const WEBHOOK = { url: "https://hooks.example/newsletter", secret: "s".repeat(40) };

function post(fields: Record<string, string>, headers: Record<string, string> = { Origin: ORIGIN }) {
  const body = new URLSearchParams(fields);
  return new Request(`${ORIGIN}/api/newsletter`, { method: "POST", body, headers });
}

function run(request: Request, overrides: Partial<Parameters<typeof handleFormPost>[0]> = {}) {
  return handleFormPost({
    request,
    schema: newsletterSchema,
    limiter: createRateLimiter({ limit: 50, windowMs: 60_000 }),
    dedupe: createDedupe(),
    webhook: WEBHOOK,
    kind: "newsletter",
    successMessage: "Welcome.",
    ...overrides,
  });
}

const VALID = { email: "Reader@Example.com", consent: "yes" };

afterEach(() => vi.unstubAllGlobals());

describe("handleFormPost", () => {
  it("rejects non-POST methods", async () => {
    const result = await run(
      new Request(`${ORIGIN}/api/newsletter`, { method: "PUT", body: "x", headers: { Origin: ORIGIN } }),
    );
    expect(result.status).toBe(405);
  });

  it("rejects cross-site submissions (CSRF)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect((await run(post(VALID, { Origin: "https://evil.example" }))).status).toBe(403);
    expect((await run(post(VALID, {}))).status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects oversized bodies", async () => {
    const request = post(VALID, { Origin: ORIGIN, "Content-Length": String(64 * 1024) });
    expect((await run(request)).status).toBe(413);
  });

  it("validates with Zod and returns field errors", async () => {
    const result = await run(post({ email: "not-an-email" }));
    expect(result.status).toBe(422);
    expect(result.body.ok).toBe(false);
    if (!result.body.ok) {
      expect(result.body.fieldErrors?.email).toBeTruthy();
      expect(result.body.fieldErrors?.consent).toBeTruthy();
    }
  });

  it("fakes success for honeypot submissions without delivering", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await run(post({ ...VALID, website: "http://spam.example" }));
    expect(result).toMatchObject({ status: 200, body: { ok: true } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("answers 503 when no delivery webhook is configured (no fake success)", async () => {
    const result = await run(post(VALID), { webhook: null });
    expect(result.status).toBe(503);
    expect(result.body.ok).toBe(false);
  });

  it("delivers once with an HMAC signature and suppresses duplicates", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const dedupe = createDedupe();
    const first = await run(post(VALID), { dedupe });
    const second = await run(post(VALID), { dedupe });
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(WEBHOOK.url);
    const body = String(init.body);
    expect(JSON.parse(body)).toMatchObject({
      type: "newsletter",
      data: { email: "reader@example.com", consent: "yes" },
    });
    expect(body).not.toContain("website");
    const signature = (init.headers as Record<string, string>)["X-Sethavelle-Signature"];
    expect(signature).toBe(await hmacSha256(WEBHOOK.secret, body));
  });

  it("returns a generic error and allows retry when delivery fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = vi.fn(async () => new Response("upstream detail", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    const dedupe = createDedupe();
    const failed = await run(post(VALID), { dedupe });
    expect(failed.status).toBe(502);
    expect(JSON.stringify(failed.body)).not.toContain("upstream detail");
    fetchMock.mockImplementation(async () => new Response(null, { status: 200 }));
    expect((await run(post(VALID), { dedupe })).status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rate limits per client", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 200 })),
    );
    const limiter = createRateLimiter({ limit: 2, windowMs: 60_000 });
    await run(post({ ...VALID, email: "a@example.com" }), { limiter });
    await run(post({ ...VALID, email: "b@example.com" }), { limiter });
    const third = await run(post({ ...VALID, email: "c@example.com" }), { limiter });
    expect(third.status).toBe(429);
    expect(new Headers(third.headers).get("Retry-After")).toBeTruthy();
  });
});

describe("schemas", () => {
  it("contact schema bounds fields and restricts topics", () => {
    expect(
      contactSchema.safeParse({
        name: "Ada",
        email: "a@b.co",
        topic: "order",
        message: "Hello there, friend.",
      }).success,
    ).toBe(true);
    expect(
      contactSchema.safeParse({
        name: "Ada",
        email: "a@b.co",
        topic: "admin",
        message: "Hello there, friend.",
      }).success,
    ).toBe(false);
    expect(
      contactSchema.safeParse({ name: "Ada", email: "a@b.co", topic: "order", message: "x".repeat(4001) })
        .success,
    ).toBe(false);
  });
});
