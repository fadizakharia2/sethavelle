import type { WritableCustomerSessionManager } from "@shopify/hydrogen/customer-account";

/**
 * Encrypted, HttpOnly cookie session.
 *
 * - Data is JSON → deflate-raw → AES-256-GCM. GCM authenticates the payload,
 *   so a tampered or forged cookie decrypts to nothing and the visitor simply
 *   gets an empty session.
 * - The key is derived from SESSION_SECRET with HKDF-SHA-256. A second secret
 *   (SESSION_SECRET_PREVIOUS) is accepted for decryption only, so secrets can
 *   be rotated without logging every customer out (docs/SECURITY.md).
 * - The `__Host-` prefix forces Secure, Path=/ and no Domain, so sibling
 *   subdomains cannot plant a session cookie (session-fixation defense).
 * - A random session id is regenerated whenever the authenticated customer
 *   state changes, so a session observed before sign-in is never the session
 *   after it.
 * - Tokens never reach client JavaScript: this module is server-only
 *   (`.server.ts`), and loaders return derived profile fields only.
 */

export const SESSION_COOKIE_NAME = "__Host-sv_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 days
const MAX_COOKIE_VALUE_BYTES = 3800;
const VERSION = "v1";
const AUTH_KEY = "customerAccount";

type SessionPayload = { sid: string; data: Record<string, unknown> };

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const keyCache = new Map<string, Promise<CryptoKey>>();

function deriveKey(secret: string): Promise<CryptoKey> {
  let key = keyCache.get(secret);
  if (!key) {
    key = crypto.subtle
      .importKey("raw", encoder.encode(secret), "HKDF", false, ["deriveKey"])
      .then((material) =>
        crypto.subtle.deriveKey(
          {
            name: "HKDF",
            hash: "SHA-256",
            salt: encoder.encode("sethavelle.session.v1"),
            info: encoder.encode("aes-256-gcm"),
          },
          material,
          { name: "AES-GCM", length: 256 },
          false,
          ["encrypt", "decrypt"],
        ),
      );
    keyCache.set(secret, key);
  }
  return key;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized + "=".repeat((4 - (normalized.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function transform(
  bytes: Uint8Array<ArrayBuffer>,
  stream: CompressionStream | DecompressionStream,
): Promise<Uint8Array<ArrayBuffer>> {
  const out = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

export async function sealSession(payload: SessionPayload, secret: string): Promise<string> {
  const json = encoder.encode(JSON.stringify(payload));
  const compressed = await transform(json, new CompressionStream("deflate-raw"));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await deriveKey(secret), compressed),
  );
  const sealed = new Uint8Array(iv.length + cipher.length);
  sealed.set(iv);
  sealed.set(cipher, iv.length);
  return `${VERSION}.${toBase64Url(sealed)}`;
}

export async function unsealSession(
  value: string,
  secrets: readonly string[],
): Promise<SessionPayload | null> {
  const [version, body] = value.split(".");
  if (version !== VERSION || !body) return null;
  let sealed: Uint8Array<ArrayBuffer>;
  try {
    sealed = fromBase64Url(body);
  } catch {
    return null;
  }
  if (sealed.length < 13) return null;
  const iv = sealed.slice(0, 12);
  const cipher = sealed.slice(12);

  for (const secret of secrets) {
    try {
      const plain = new Uint8Array(
        await crypto.subtle.decrypt({ name: "AES-GCM", iv }, await deriveKey(secret), cipher),
      );
      const json = decoder.decode(await transform(plain, new DecompressionStream("deflate-raw")));
      const parsed: unknown = JSON.parse(json);
      if (
        parsed &&
        typeof parsed === "object" &&
        typeof (parsed as SessionPayload).sid === "string" &&
        typeof (parsed as SessionPayload).data === "object"
      ) {
        return parsed as SessionPayload;
      }
      return null;
    } catch {
      // Wrong key or tampered payload: try the next secret.
    }
  }
  return null;
}

export function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return undefined;
}

export function serializeSessionCookie(value: string, maxAge = SESSION_MAX_AGE_SECONDS): string {
  return [
    `${SESSION_COOKIE_NAME}=${value}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
  ].join("; ");
}

function newSessionId(): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(16)));
}

export async function createRequestSessionManager(
  request: Request,
  secrets: readonly [string, ...string[]],
): Promise<WritableCustomerSessionManager & { readonly sessionId: string }> {
  const raw = readCookie(request.headers.get("cookie"), SESSION_COOKIE_NAME);
  const existing = raw ? await unsealSession(raw, secrets) : null;
  const data = new Map<string, unknown>(Object.entries(existing?.data ?? {}));
  let sid = existing?.sid ?? newSessionId();
  // Re-encrypt with the current secret if the cookie was sealed with an old one.
  let dirty = raw !== undefined && existing === null;
  const origin = new URL(request.url).origin;

  const touchAuth = (key: string) => {
    // Rotate the session id whenever authentication state changes.
    if (key === AUTH_KEY) sid = newSessionId();
  };

  return {
    get sessionId() {
      return sid;
    },
    getSessionOrigin: () => origin,
    getSessionItem: (key) => data.get(key),
    setSessionItem: (key, value) => {
      touchAuth(key);
      data.set(key, value);
      dirty = true;
    },
    removeSessionItem: (key) => {
      touchAuth(key);
      if (data.delete(key)) dirty = true;
    },
    async commit() {
      if (!dirty) return;
      dirty = false;
      if (data.size === 0) {
        return { "set-cookie": serializeSessionCookie("", 0) };
      }
      const sealed = await sealSession({ sid, data: Object.fromEntries(data) }, secrets[0]);
      if (sealed.length > MAX_COOKIE_VALUE_BYTES) {
        // Never emit a cookie the browser would silently drop or truncate.
        console.error("Session cookie exceeds the safe size limit; session not persisted.");
        return { "set-cookie": serializeSessionCookie("", 0) };
      }
      return { "set-cookie": serializeSessionCookie(sealed) };
    },
  };
}

/** In-memory session for requests without Customer Accounts configured. */
export function createEphemeralSessionManager(request: Request): WritableCustomerSessionManager {
  const data = new Map<string, unknown>();
  const origin = new URL(request.url).origin;
  return {
    getSessionOrigin: () => origin,
    getSessionItem: (key) => data.get(key),
    setSessionItem: (key, value) => {
      data.set(key, value);
    },
    removeSessionItem: (key) => {
      data.delete(key);
    },
  };
}
