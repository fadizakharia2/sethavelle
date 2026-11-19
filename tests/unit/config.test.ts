import { describe, expect, it } from "vitest";

import { ConfigError, parseConfig, toPublicConfig } from "~/lib/server/config.server";

const SECRET = "x".repeat(40);
const PRIVATE_TOKEN = "private-storefront-token-0123456789";

function issues(fn: () => unknown): string[] {
  try {
    fn();
  } catch (error) {
    if (error instanceof ConfigError) return error.issues;
    throw error;
  }
  return [];
}

describe("parseConfig", () => {
  it("falls back to the mock shop in development with no store", () => {
    const config = parseConfig({}, "development");
    expect(config.storefront.kind).toBe("mock");
    expect(config.customerAccount).toBeNull();
  });

  it("fails closed in production without a store domain", () => {
    expect(issues(() => parseConfig({}, "production")).join()).toMatch(/PUBLIC_STORE_DOMAIN is required/);
  });

  it("allows an explicit production demo with MOCK_SHOP=1", () => {
    expect(parseConfig({ MOCK_SHOP: "1" }, "production").storefront.kind).toBe("mock");
  });

  it("rejects non-myshopify domains", () => {
    expect(
      issues(() =>
        parseConfig(
          { PUBLIC_STORE_DOMAIN: "evil.example", PRIVATE_STOREFRONT_API_TOKEN: PRIVATE_TOKEN },
          "production",
        ),
      ).join(),
    ).toMatch(/myshopify\.com/);
  });

  it("prefers the private token and requires one when a domain is set", () => {
    const config = parseConfig(
      {
        PUBLIC_STORE_DOMAIN: "sv.myshopify.com",
        PRIVATE_STOREFRONT_API_TOKEN: PRIVATE_TOKEN,
        PUBLIC_STOREFRONT_API_TOKEN: "pub-token-123",
      },
      "production",
    );
    expect(config.storefront.kind).toBe("private");
    expect(
      issues(() => parseConfig({ PUBLIC_STORE_DOMAIN: "sv.myshopify.com" }, "production")).join(),
    ).toMatch(/TOKEN is required/);
  });

  it("rejects an Admin API token used as a storefront token", () => {
    expect(
      issues(() =>
        parseConfig(
          { PUBLIC_STORE_DOMAIN: "sv.myshopify.com", PRIVATE_STOREFRONT_API_TOKEN: "shpat_abc123" },
          "production",
        ),
      ).join(),
    ).toMatch(/Admin API token/);
  });

  it("rejects identical private and public tokens", () => {
    expect(
      issues(() =>
        parseConfig(
          {
            PUBLIC_STORE_DOMAIN: "sv.myshopify.com",
            PRIVATE_STOREFRONT_API_TOKEN: PRIVATE_TOKEN,
            PUBLIC_STOREFRONT_API_TOKEN: PRIVATE_TOKEN,
          },
          "production",
        ),
      ).join(),
    ).toMatch(/must not equal/);
  });

  it("requires all customer account variables together and a strong secret", () => {
    const base = { PUBLIC_STORE_DOMAIN: "sv.myshopify.com", PRIVATE_STOREFRONT_API_TOKEN: PRIVATE_TOKEN };
    expect(issues(() => parseConfig({ ...base, SHOP_ID: "123" }, "production")).join()).toMatch(
      /need all of/,
    );
    expect(
      issues(() =>
        parseConfig(
          {
            ...base,
            SHOP_ID: "123",
            PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID: "client",
            SESSION_SECRET: "short",
          },
          "production",
        ),
      ).join(),
    ).toMatch(/at least 32/);
    expect(
      issues(() =>
        parseConfig(
          {
            ...base,
            SHOP_ID: "123",
            PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID: "client",
            SESSION_SECRET: `replace-with-${SECRET}`,
          },
          "production",
        ),
      ).join(),
    ).toMatch(/placeholder/);
    const ok = parseConfig(
      {
        ...base,
        SHOP_ID: "123",
        PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID: "client",
        SESSION_SECRET: SECRET,
        SESSION_SECRET_PREVIOUS: "y".repeat(40),
      },
      "production",
    );
    expect(ok.customerAccount?.sessionSecrets).toEqual([SECRET, "y".repeat(40)]);
  });

  it("requires a webhook secret alongside a webhook URL, and https only", () => {
    expect(
      issues(() => parseConfig({ NEWSLETTER_WEBHOOK_URL: "https://hooks.example/n" }, "development")).join(),
    ).toMatch(/NEWSLETTER_WEBHOOK_SECRET/);
    expect(
      issues(() =>
        parseConfig(
          { CONTACT_WEBHOOK_URL: "http://hooks.example/c", CONTACT_WEBHOOK_SECRET: SECRET },
          "development",
        ),
      ).join(),
    ).toMatch(/https/);
  });

  it("validates marketing ID formats", () => {
    expect(issues(() => parseConfig({ PUBLIC_GA4_MEASUREMENT_ID: "UA-1234" }, "development")).join()).toMatch(
      /GA4/,
    );
    expect(parseConfig({ PUBLIC_GA4_MEASUREMENT_ID: "G-ABC123XYZ" }, "development").marketing.ga4).toBe(
      "G-ABC123XYZ",
    );
  });

  it("never puts secret values in error messages", () => {
    const secret = "shpat_supersecretvalue";
    const error = (() => {
      try {
        parseConfig(
          {
            PUBLIC_STORE_DOMAIN: "sv.myshopify.com",
            PRIVATE_STOREFRONT_API_TOKEN: secret,
            SESSION_SECRET: "tiny-secret",
          },
          "production",
        );
      } catch (e) {
        return e as Error;
      }
    })();
    expect(error?.message).toBeDefined();
    expect(error?.message).not.toContain(secret);
    expect(error?.message).not.toContain("tiny-secret");
  });
});

describe("toPublicConfig", () => {
  it("exposes an allowlist only — no tokens, secrets or webhook URLs", () => {
    const config = parseConfig(
      {
        PUBLIC_STORE_DOMAIN: "sv.myshopify.com",
        PRIVATE_STOREFRONT_API_TOKEN: PRIVATE_TOKEN,
        SHOP_ID: "123",
        PUBLIC_CUSTOMER_ACCOUNT_API_CLIENT_ID: "client",
        SESSION_SECRET: SECRET,
        NEWSLETTER_WEBHOOK_URL: "https://hooks.example/n",
        NEWSLETTER_WEBHOOK_SECRET: "w".repeat(40),
      },
      "production",
    );
    const serialized = JSON.stringify(toPublicConfig(config));
    for (const forbidden of [PRIVATE_TOKEN, SECRET, "w".repeat(40), "hooks.example", '"123"']) {
      expect(serialized).not.toContain(forbidden);
    }
    expect(Object.keys(toPublicConfig(config)).sort()).toEqual([
      "customerAccountsEnabled",
      "demoMode",
      "marketing",
      "siteUrl",
    ]);
  });
});

describe("preview catalog", () => {
  it("defaults to the fragrance demo store and accepts other mock.shop hosts", () => {
    expect(parseConfig({}, "development").storefront.storeDomain).toBe("arabic-attars.mock.shop");
    expect(parseConfig({ PUBLIC_STORE_DOMAIN: "fragrance.mock.shop" }, "development").storefront).toEqual({
      kind: "mock",
      storeDomain: "fragrance.mock.shop",
    });
  });
});
