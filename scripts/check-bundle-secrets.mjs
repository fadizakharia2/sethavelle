#!/usr/bin/env node
/**
 * Fails the build if anything that looks like a credential, or the name of a
 * server-only variable, appears in the browser bundle (dist/client).
 *
 * Run after `pnpm build`. Also checks the values of any secrets present in the
 * current process environment (e.g. CI injecting real values for the build):
 * those exact strings must never appear in client assets.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";

const CLIENT_DIR = process.argv[2] ?? new URL("../dist/client/", import.meta.url).pathname;

// Names that must never be shipped to the browser.
const SERVER_ONLY_NAMES = [
  "PRIVATE_STOREFRONT_API_TOKEN",
  "SESSION_SECRET",
  "SESSION_SECRET_PREVIOUS",
  "NEWSLETTER_WEBHOOK_SECRET",
  "CONTACT_WEBHOOK_SECRET",
  "NEWSLETTER_WEBHOOK_URL",
  "CONTACT_WEBHOOK_URL",
  "SHOP_ID",
];

// Credential shapes (Shopify token prefixes, private keys, generic secrets).
const SECRET_PATTERNS = [
  [/shpat_[a-f0-9]{16,}/i, "Shopify Admin API access token"],
  [/shpss_[a-f0-9]{16,}/i, "Shopify shared secret"],
  [/shpca_[a-f0-9]{16,}/i, "Shopify custom app token"],
  [/shppa_[a-f0-9]{16,}/i, "Shopify private app token"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "PEM private key"],
  [/\bsk_live_[A-Za-z0-9]{10,}/, "live secret key"],
  [/\bAKIA[0-9A-Z]{16}\b/, "AWS access key id"],
];

const TEXT_EXT = /\.(m?js|css|html|json|map|txt|svg|xml)$/i;

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (TEXT_EXT.test(entry.name)) yield path;
  }
}

async function main() {
  try {
    await stat(CLIENT_DIR);
  } catch {
    console.error("dist/client not found. Run the build first.");
    process.exit(2);
  }

  const envValues = SERVER_ONLY_NAMES.map((name) => [name, process.env[name]]).filter(
    ([, value]) => typeof value === "string" && value.length >= 12,
  );

  const findings = [];
  let files = 0;
  for await (const file of walk(CLIENT_DIR)) {
    files++;
    const text = await readFile(file, "utf8");
    const rel = relative(CLIENT_DIR, file);
    for (const name of SERVER_ONLY_NAMES) {
      if (new RegExp(`\\b${name}\\b`).test(text))
        findings.push(`${rel}: references server-only variable ${name}`);
    }
    for (const [pattern, label] of SECRET_PATTERNS) {
      if (pattern.test(text)) findings.push(`${rel}: contains something shaped like a ${label}`);
    }
    for (const [name, value] of envValues) {
      // Report the variable name only; never print the value.
      if (text.includes(value)) findings.push(`${rel}: contains the value of ${name}`);
    }
  }

  if (findings.length > 0) {
    console.error(`✗ Secret audit failed (${findings.length} finding(s)):`);
    for (const finding of findings) console.error(`  - ${finding}`);
    process.exit(1);
  }
  console.log(
    `✓ Secret audit passed: ${files} client file(s) scanned, no secrets or server-only names found.`,
  );
}

await main();
