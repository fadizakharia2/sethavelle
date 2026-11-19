import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const SCRIPT = new URL("../../scripts/check-bundle-secrets.mjs", import.meta.url).pathname;

function audit(files: Record<string, string>, env: Record<string, string> = {}) {
  const dir = mkdtempSync(join(tmpdir(), "sv-audit-"));
  for (const [name, content] of Object.entries(files)) {
    mkdirSync(join(dir, name, ".."), { recursive: true });
    writeFileSync(join(dir, name), content);
  }
  try {
    return {
      code: 0,
      out: execFileSync("node", [SCRIPT, dir], { env: { ...process.env, ...env }, stdio: "pipe" }).toString(),
    };
  } catch (error) {
    const e = error as { status: number; stderr: Buffer };
    return { code: e.status, out: e.stderr.toString() };
  }
}

describe("client bundle secret audit", () => {
  it("passes a clean bundle", () => {
    expect(audit({ "assets/app.js": "console.log('hello')" }).code).toBe(0);
  });

  it("fails on server-only variable names", () => {
    const result = audit({ "assets/app.js": "const t = env.PRIVATE_STOREFRONT_API_TOKEN;" });
    expect(result.code).toBe(1);
    expect(result.out).toContain("PRIVATE_STOREFRONT_API_TOKEN");
  });

  it("fails on admin-token-shaped strings", () => {
    expect(audit({ "assets/x.js": `"shpat_${"a".repeat(32)}"` }).code).toBe(1);
  });

  it("fails when a live secret value leaks, without printing it", () => {
    const secret = "live-session-secret-value-0123456789";
    const result = audit({ "assets/x.js": `var s="${secret}"` }, { SESSION_SECRET: secret });
    expect(result.code).toBe(1);
    expect(result.out).not.toContain(secret);
  });
});
