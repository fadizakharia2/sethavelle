import { describe, expect, it, vi } from "vitest";

import {
  createRequestSessionManager,
  readCookie,
  sealSession,
  SESSION_COOKIE_NAME,
  unsealSession,
} from "~/lib/server/session.server";

const SECRET = "a".repeat(48);
const OLD = "b".repeat(48);
const ORIGIN = "https://sethavelle.example";

async function setCookieOf(manager: { commit?: () => unknown }) {
  const headers = new Headers(((await manager.commit?.()) as HeadersInit | undefined) ?? undefined);
  return headers.get("set-cookie");
}

function withCookie(setCookie: string | null) {
  const pair = setCookie?.split(";")[0];
  return new Request(ORIGIN, { headers: pair ? { cookie: pair } : {} });
}

describe("encrypted session cookie", () => {
  it("round-trips data and sets hardened cookie attributes", async () => {
    const first = await createRequestSessionManager(new Request(ORIGIN), [SECRET]);
    await first.setSessionItem("customerAccount", { tokens: { accessToken: "token-value" } });
    const cookie = await setCookieOf(first);

    expect(cookie).toMatch(new RegExp(`^${SESSION_COOKIE_NAME}=v1\\.`));
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/Secure/);
    expect(cookie).toMatch(/SameSite=Lax/);
    expect(cookie).toMatch(/Path=\//);
    expect(cookie).not.toMatch(/Domain=/i);
    // Encrypted: the token is not readable in the cookie.
    expect(cookie).not.toContain("token-value");

    const second = await createRequestSessionManager(withCookie(cookie), [SECRET]);
    expect(await second.getSessionItem("customerAccount")).toEqual({
      tokens: { accessToken: "token-value" },
    });
  });

  it("does not emit a cookie when nothing changed", async () => {
    const manager = await createRequestSessionManager(new Request(ORIGIN), [SECRET]);
    expect(await setCookieOf(manager)).toBeNull();
  });

  it("rejects tampered cookies", async () => {
    const sealed = await sealSession({ sid: "s", data: { a: 1 } }, SECRET);
    const body = sealed.slice(3);
    const flipped = `v1.${body.slice(0, 20)}${body[20] === "A" ? "B" : "A"}${body.slice(21)}`;
    expect(await unsealSession(flipped, [SECRET])).toBeNull();
    expect(await unsealSession("v1.not-base64!!", [SECRET])).toBeNull();
    expect(await unsealSession("v2.abc", [SECRET])).toBeNull();
  });

  it("rejects cookies sealed with an unknown secret (forgery)", async () => {
    const forged = await sealSession(
      { sid: "s", data: { customerAccount: { evil: true } } },
      "attacker".repeat(8),
    );
    expect(await unsealSession(forged, [SECRET])).toBeNull();
  });

  it("accepts the previous secret during rotation and re-seals with the current one", async () => {
    const legacy = await sealSession({ sid: "s", data: { a: 1 } }, OLD);
    expect(await unsealSession(legacy, [SECRET])).toBeNull();
    expect(await unsealSession(legacy, [SECRET, OLD])).toMatchObject({ data: { a: 1 } });
  });

  it("rotates the session id when authentication state changes (fixation defense)", async () => {
    const manager = await createRequestSessionManager(new Request(ORIGIN), [SECRET]);
    await manager.setSessionItem("cart", "x");
    const before = manager.sessionId;
    await manager.setSessionItem("customerAccount", { signedIn: true });
    const afterLogin = manager.sessionId;
    expect(afterLogin).not.toBe(before);
    await manager.removeSessionItem("customerAccount");
    expect(manager.sessionId).not.toBe(afterLogin);
  });

  it("clears the cookie when the session empties (logout)", async () => {
    const first = await createRequestSessionManager(new Request(ORIGIN), [SECRET]);
    await first.setSessionItem("customerAccount", { a: 1 });
    const second = await createRequestSessionManager(withCookie(await setCookieOf(first)), [SECRET]);
    await second.removeSessionItem("customerAccount");
    expect(await setCookieOf(second)).toMatch(/Max-Age=0/);
  });

  it("refuses to emit an oversized cookie", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const manager = await createRequestSessionManager(new Request(ORIGIN), [SECRET]);
    const random = Array.from(crypto.getRandomValues(new Uint8Array(4000)), (b) => b.toString(36)).join("");
    await manager.setSessionItem("blob", random);
    expect(await setCookieOf(manager)).toMatch(/Max-Age=0/);
    expect(spy).toHaveBeenCalled();
    expect(String(spy.mock.calls[0]?.[0])).not.toContain(random.slice(0, 50));
  });

  it("parses cookie headers exactly by name", () => {
    expect(readCookie("a=1; __Host-sv_session=v1.x; b=2", SESSION_COOKIE_NAME)).toBe("v1.x");
    expect(readCookie("x__Host-sv_session=evil", SESSION_COOKIE_NAME)).toBeUndefined();
    expect(readCookie(null, SESSION_COOKIE_NAME)).toBeUndefined();
  });
});
