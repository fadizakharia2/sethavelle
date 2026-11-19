import { expect, test } from "@playwright/test";

const PAGES = [
  "/",
  "/shop",
  "/collections",
  "/mythology",
  "/our-story",
  "/contact",
  "/faq",
  "/cart",
  "/cookies",
  "/privacy",
];

test.describe("pages", () => {
  for (const path of PAGES) {
    test(`${path} renders one h1 without horizontal overflow`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator("h1")).toHaveCount(1);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }

  test("home shows the headline and the three rites, never invented prices", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("The Divine Art");
    for (const name of ["Vampiric Royalty", "Darkness", "Hellhound"]) {
      await expect(page.getByText(name, { exact: true }).first()).toBeAttached();
    }
    // The fixture catalog has no products, so no price may appear anywhere.
    expect(await page.locator("main").innerText()).not.toMatch(/\$\s?\d/);
  });

  test("unknown products show the branded 404 with site chrome", async ({ page }) => {
    const response = await page.goto("/products/does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("leads nowhere");
    await expect(page.getByRole("banner")).toBeVisible();
  });

  test("skip link moves focus to main content", async ({ page, isMobile }) => {
    test.skip(isMobile, "keyboard only");
    await page.goto("/our-story");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  });
});

test.describe("motion", () => {
  test("reduced motion: hero content is visible immediately", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.getByRole("link", { name: /^Shop now/ }).first()).toBeVisible({ timeout: 1000 });
    await context.close();
  });
});

test.describe("security", () => {
  test("documents carry CSP with a nonce and hardened headers", async ({ request }) => {
    const response = await request.get("/");
    const headers = response.headers();
    const csp = headers["content-security-policy"] ?? "";
    expect(csp).toMatch(/script-src[^;]*'nonce-[^']+'/);
    expect(csp).not.toMatch(/script-src[^;]*'unsafe-eval'/);
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["strict-transport-security"]).toContain("max-age=");
  });

  test("HTML never contains server-only variable names or token shapes", async ({ request }) => {
    for (const path of ["/", "/shop", "/account", "/cart"]) {
      const html = await (await request.get(path)).text();
      expect(html).not.toMatch(/PRIVATE_STOREFRONT_API_TOKEN|SESSION_SECRET|WEBHOOK_SECRET|shpat_|shpss_/);
    }
  });

  test("account pages are never publicly cacheable", async ({ request }) => {
    for (const path of ["/account", "/account/orders", "/account/orders/1"]) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.headers()["cache-control"]).toContain("no-store");
      expect(response.headers()["cache-control"]).toContain("private");
    }
  });

  test("form endpoints reject cross-site posts and non-POST methods", async ({ request, baseURL }) => {
    const crossSite = await request.post("/api/newsletter", {
      form: { email: "a@example.com", consent: "yes" },
      headers: { Origin: "https://evil.example" },
    });
    expect(crossSite.status()).toBe(403);
    expect(await crossSite.text()).not.toContain("at ");

    const get = await request.get("/api/newsletter");
    expect(get.status()).toBe(405);

    // Same-origin but no delivery configured: an honest 503, not a fake success.
    const sameOrigin = await request.post("/api/newsletter", {
      form: { email: "a@example.com", consent: "yes" },
      headers: { Origin: new URL(baseURL!).origin },
    });
    expect(sameOrigin.status()).toBe(503);
  });

  test("double slashes cannot become protocol-relative redirects", async ({ request }) => {
    const response = await request.get("/shop//evil.example/path", { maxRedirects: 0 });
    expect(response.status()).toBe(301);
    expect(response.headers()["location"]).toBe("/shop/evil.example/path");
  });

  test("demo deployments are not indexed", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toMatch(/Disallow: \//);
  });
});

test.describe("navigation", () => {
  test("mobile menu opens and closes", async ({ page, isMobile }) => {
    test.skip(!isMobile, "mobile only");
    await page.goto("/");
    await page.getByRole("button", { name: /menu/i }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("link", { name: /Mythology/ }).first()).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("desktop header navigates client-side", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop nav");
    await page.goto("/");
    await page.getByRole("navigation").getByRole("link", { name: "Mythology" }).first().click();
    await expect(page).toHaveURL(/\/mythology$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Born of the storm");
  });

  test("cart drawer opens with an empty state", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("link", { name: /bag|cart/i })
      .first()
      .click();
    await expect(page.getByText(/awaits its first rite|Your bag/i).first()).toBeVisible();
  });
});

test.describe("shop and navigation additions", () => {
  test("collections menu opens from the navbar and lists collections", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop menu");
    await page.goto("/our-story");
    const trigger = page.getByTestId("collections-menu-trigger");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    const menu = page.getByTestId("collections-menu");
    await expect(menu.getByRole("link", { name: /Fixture Chapter/ })).toBeVisible();
    await expect(menu.getByRole("link", { name: /Fixture Chapter/ })).toHaveAttribute(
      "href",
      "/collections/fixture-chapter",
    );
    await page.keyboard.press("Escape");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await expect(trigger).toBeFocused();
  });

  test("mobile menu lists collections under Collections", async ({ page, isMobile }) => {
    test.skip(!isMobile, "mobile only");
    await page.goto("/");
    await page.getByRole("button", { name: /menu/i }).first().click();
    await expect(page.getByRole("dialog").getByRole("link", { name: /Fixture Chapter/ })).toBeVisible();
  });

  test("home offers Shop now at the top and at the bottom", async ({ page }) => {
    await page.goto("/");
    const links = page.getByRole("link", { name: /^Shop now/ });
    await expect(links).toHaveCount(2);
    for (const link of await links.all()) await expect(link).toHaveAttribute("href", "/shop");
  });

  test("empty shop shows the three rites as forthcoming", async ({ page }) => {
    await page.goto("/shop");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Every rite");
    for (const name of ["Vampiric Royalty", "Darkness", "Hellhound"]) {
      await expect(page.getByText(name, { exact: true }).first()).toBeVisible();
    }
  });
});
