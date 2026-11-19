import { describe, expect, it } from "vitest";

import { parseConfig } from "~/lib/server/config.server";
import { createDocumentCsp } from "~/lib/server/csp.server";

function csp(env: Parameters<typeof parseConfig>[0]) {
  return createDocumentCsp(parseConfig(env, "development"));
}

describe("document CSP", () => {
  it("uses a nonce and no unsafe-eval / unsafe-inline for scripts", () => {
    const { header, nonce } = csp({});
    expect(nonce).toBeTruthy();
    const scriptSrc = header.split(";").find((d) => d.trim().startsWith("script-src")) ?? "";
    expect(scriptSrc).toContain(`'nonce-${nonce}'`);
    expect(scriptSrc).not.toContain("unsafe-eval");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(header).toMatch(/frame-ancestors 'none'|frame-ancestors 'self'/);
  });

  it("only allows marketing vendors whose IDs are configured", () => {
    const bare = csp({}).header;
    expect(bare).not.toContain("googletagmanager");
    expect(bare).not.toContain("facebook");
    expect(bare).not.toContain("tiktok");
    const withMeta = csp({ PUBLIC_META_PIXEL_ID: "1234567890" }).header;
    expect(withMeta).toContain("https://connect.facebook.net");
    expect(withMeta).not.toContain("googletagmanager");
  });

  it("issues a fresh nonce per document", () => {
    expect(csp({}).nonce).not.toBe(csp({}).nonce);
  });
});
