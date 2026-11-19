/**
 * Serves the PRODUCTION build (dist/) offline for Playwright:
 * - the built Oxygen worker runs in Node with a no-op Cache API,
 * - Storefront API calls are answered by ./fixture-storefront.mjs,
 * - every other outbound request is refused (no real network in tests).
 *
 * Usage: node tests/e2e/harness/server.mjs   (after `pnpm build`)
 */
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { Readable } from "node:stream";

import { respond } from "./fixture-storefront.mjs";

process.env.NODE_ENV = "production";
const PORT = Number(process.env.PORT ?? 4173);
const ROOT = new URL("../../../dist/", import.meta.url).pathname;
const CLIENT = join(ROOT, "client");

const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const request = new Request(input, init);
  const url = new URL(request.url);
  if (url.hostname.endsWith("mock.shop") && url.pathname.includes("graphql")) return respond(request);
  if (url.hostname.endsWith("mock.shop") && url.pathname.startsWith("/api")) return respond(request);
  void realFetch;
  return new Response("Outbound network disabled in tests", { status: 503 });
};

globalThis.caches = {
  async open() {
    return { match: async () => undefined, put: async () => undefined, delete: async () => false };
  },
};

const { default: worker } = await import(join(ROOT, "server/index.js"));

const ENV = { MOCK_SHOP: "1", PUBLIC_SITE_URL: `http://localhost:${PORT}`.replace("http:", "https:") };
const TYPES = {
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".txt": "text/plain",
};

function serveStatic(pathname, res) {
  const file = normalize(join(CLIENT, decodeURIComponent(pathname)));
  if (!file.startsWith(CLIENT) || !existsSync(file) || !statSync(file).isFile()) return false;
  res.writeHead(200, {
    "content-type": TYPES[extname(file)] ?? "application/octet-stream",
    "cache-control": "public, max-age=31536000, immutable",
  });
  createReadStream(file).pipe(res);
  return true;
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  if (url.pathname !== "/" && serveStatic(url.pathname, res)) return;

  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v);
  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  const request = new Request(url, {
    method: req.method,
    headers,
    body: hasBody ? Readable.toWeb(req) : undefined,
    duplex: hasBody ? "half" : undefined,
  });
  const pending = [];
  const response = await worker.fetch(request, ENV, {
    waitUntil: (p) => pending.push(p),
    passThroughOnException() {},
  });
  const outHeaders = {};
  response.headers.forEach((value, key) => {
    outHeaders[key] = key === "set-cookie" ? response.headers.getSetCookie() : value;
  });
  res.writeHead(response.status, outHeaders);
  if (response.body) {
    Readable.fromWeb(response.body).pipe(res);
  } else res.end();
}).listen(PORT, () => console.log(`e2e harness on http://localhost:${PORT}`));
