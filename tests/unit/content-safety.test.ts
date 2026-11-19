import { describe, expect, it } from "vitest";

import { parseFragranceMetafields, hasNotes } from "~/lib/fragrance-metafields";
import { htmlToBlocks } from "~/lib/rich-text";
import { canonicalUrl, serializeJsonLd, truncate } from "~/lib/seo";
import { scrubUrl } from "~/lib/marketing";

describe("serializeJsonLd", () => {
  it("cannot be broken out of a <script> element", () => {
    const out = serializeJsonLd({ name: "</script><script>alert(1)</script><!--", note: "a b&c" });
    expect(out).not.toMatch(/<|>|&/);
    expect(out).not.toContain(" ");
    expect(JSON.parse(out)).toEqual({ name: "</script><script>alert(1)</script><!--", note: "a b&c" });
  });
});

describe("htmlToBlocks (merchant HTML → text only)", () => {
  it("drops scripts, handlers and markup, keeping structure as text", () => {
    const blocks = htmlToBlocks(
      `<h2>Returns</h2><p onclick="steal()">Within <b>30</b> days &amp; unopened.</p>
       <script>alert(1)</script><img src=x onerror=alert(1)><ul><li>One</li><li><a href="javascript:x">Two</a></li></ul>
       <iframe src="https://evil.example"></iframe>`,
    );
    expect(blocks).toEqual([
      { type: "heading", level: 2, text: "Returns" },
      { type: "paragraph", text: "Within 30 days & unopened." },
      { type: "list", ordered: false, items: ["One", "Two"] },
    ]);
    const all = JSON.stringify(blocks);
    for (const bad of ["alert", "onclick", "onerror", "javascript:", "iframe", "<"])
      expect(all).not.toContain(bad);
  });

  it("decoded entities stay text (React escapes them on render)", () => {
    expect(htmlToBlocks("<p>&lt;script&gt;x&lt;/script&gt;</p>")).toEqual([
      { type: "paragraph", text: "<script>x</script>" },
    ]);
  });

  it("handles empty input", () => {
    expect(htmlToBlocks(null)).toEqual([]);
  });
});

describe("fragrance metafields", () => {
  it("parses list and text metafields, never inventing notes", () => {
    const details = parseFragranceMetafields([
      {
        key: "top_notes",
        type: "list.single_line_text_field",
        value: JSON.stringify(["Saffron", " ", "Plum"]),
      },
      { key: "heart_notes", type: "multi_line_text_field", value: "Rose,\nOud" },
      null,
      { key: "story", type: "multi_line_text_field", value: "  A story.  " },
    ]);
    expect(details.topNotes).toEqual(["Saffron", "Plum"]);
    expect(details.heartNotes).toEqual(["Rose", "Oud"]);
    expect(details.baseNotes).toEqual([]);
    expect(details.story).toBe("A story.");
    expect(details.concentration).toBeNull();
    expect(hasNotes(details)).toBe(true);
    expect(hasNotes(parseFragranceMetafields(null))).toBe(false);
  });

  it("survives malformed JSON", () => {
    expect(
      parseFragranceMetafields([{ key: "top_notes", type: "list.single_line_text_field", value: "[oops" }])
        .topNotes,
    ).toEqual([]);
  });
});

describe("seo helpers", () => {
  it("canonical URLs drop query strings except allowlisted params and use the site URL", () => {
    expect(
      canonicalUrl(
        "https://www.sethavelle.com",
        "https://preview.example/products/darkness?utm_source=x&variant=1",
      ),
    ).toBe("https://www.sethavelle.com/products/darkness");
    expect(canonicalUrl(undefined, "https://shop.example/shop?page=2&utm=x", ["page"])).toBe(
      "https://shop.example/shop?page=2",
    );
  });

  it("truncates on word boundaries", () => {
    expect(truncate("one two three four", 10)).toBe("one two…");
  });
});

describe("analytics URL scrubbing", () => {
  it("strips query strings and fragments that could carry tokens or PII", () => {
    expect(scrubUrl("https://sethavelle.example/account/authorize?code=abc&state=def#x")).toBe(
      "https://sethavelle.example/account/authorize",
    );
    expect(scrubUrl("/search?q=my%40email.com")).toBe("/search");
    expect(scrubUrl(undefined)).toBeUndefined();
  });
});
