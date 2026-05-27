import { describe, expect, it } from "vitest";

import type { FileSource } from "@protolabsai/types";

import { HtmlAdapter } from "../html-adapter.js";

function makeFileSource(content: string, mediaType = "text/html"): FileSource {
  return {
    type: "file",
    buffer: Buffer.from(content, "utf-8"),
    mediaType,
  };
}

describe("HtmlAdapter", () => {
  const adapter = new HtmlAdapter();

  describe("canHandle", () => {
    it("returns true for text/html", () => {
      expect(adapter.canHandle(makeFileSource("<p>hi</p>", "text/html"))).toBe(
        true
      );
    });

    it("returns true for text/html; charset=utf-8", () => {
      expect(
        adapter.canHandle(
          makeFileSource("<p>hi</p>", "text/html; charset=utf-8")
        )
      ).toBe(true);
    });

    it("returns false for text/plain", () => {
      expect(adapter.canHandle(makeFileSource("<p>hi</p>", "text/plain"))).toBe(
        false
      );
    });

    it("returns false for text/markdown", () => {
      expect(
        adapter.canHandle(makeFileSource("<p>hi</p>", "text/markdown"))
      ).toBe(false);
    });
  });

  describe("extract — title", () => {
    it("extracts <title> content", async () => {
      const html =
        "<html><head><title>Page Title</title></head><body></body></html>";
      const result = await adapter.extract(makeFileSource(html));
      expect(result.metadata.title).toBe("Page Title");
    });

    it("omits title from metadata when <title> is absent", async () => {
      const html = "<html><body><p>hello</p></body></html>";
      const result = await adapter.extract(makeFileSource(html));
      expect(result.metadata).not.toHaveProperty("title");
    });

    it("decodes HTML entities in title", async () => {
      const html = "<title>A &amp; B</title>";
      const result = await adapter.extract(makeFileSource(html));
      expect(result.metadata.title).toBe("A & B");
    });
  });

  describe("extract — meta tags", () => {
    it("extracts name/content meta pairs", async () => {
      const html = `<html><head>
        <meta name="description" content="A test page">
        <meta name="keywords" content="test, html">
      </head><body></body></html>`;
      const result = await adapter.extract(makeFileSource(html));
      expect(result.metadata.metaTags).toMatchObject({
        description: "A test page",
        keywords: "test, html",
      });
    });

    it("extracts property/content Open Graph meta pairs", async () => {
      const html = `<head>
        <meta property="og:title" content="OG Title">
      </head>`;
      const result = await adapter.extract(makeFileSource(html));
      expect(
        (result.metadata.metaTags as Record<string, string>)["og:title"]
      ).toBe("OG Title");
    });

    it("returns empty metaTags object when none present", async () => {
      const result = await adapter.extract(makeFileSource("<p>hello</p>"));
      expect(result.metadata.metaTags).toEqual({});
    });
  });

  describe("extract — text stripping", () => {
    it("removes HTML tags from plain text", async () => {
      const html = "<p>Hello <strong>world</strong>!</p>";
      const result = await adapter.extract(makeFileSource(html));
      expect(result.text).toContain("Hello");
      expect(result.text).toContain("world");
      expect(result.text).not.toContain("<p>");
      expect(result.text).not.toContain("<strong>");
    });

    it("removes <script> block content", async () => {
      const html =
        "<html><body><p>Visible</p><script>alert('xss')</script></body></html>";
      const result = await adapter.extract(makeFileSource(html));
      expect(result.text).toContain("Visible");
      expect(result.text).not.toContain("alert");
    });

    it("removes <style> block content", async () => {
      const html =
        "<html><head><style>body { color: red; }</style></head><body><p>Text</p></body></html>";
      const result = await adapter.extract(makeFileSource(html));
      expect(result.text).not.toContain("color");
      expect(result.text).toContain("Text");
    });

    it("decodes HTML entities in body text", async () => {
      const html = "<p>Price: &pound;10 &amp; tax</p>";
      const result = await adapter.extract(makeFileSource(html));
      expect(result.text).toContain("&");
    });
  });

  describe("extract — metadata", () => {
    it("sets category to 'document'", async () => {
      const result = await adapter.extract(makeFileSource("<p>hi</p>"));
      expect(result.category).toBe("document");
    });

    it("includes wordCount in metadata", async () => {
      const result = await adapter.extract(
        makeFileSource("<p>one two three</p>")
      );
      expect(result.metadata.wordCount).toBe(3);
    });

    it("returns empty artifacts array", async () => {
      const result = await adapter.extract(makeFileSource("<p>hi</p>"));
      expect(result.artifacts).toEqual([]);
    });
  });

  describe("getMetadata", () => {
    it("returns title and metaTags", async () => {
      const html = `<html><head>
        <title>My Page</title>
        <meta name="author" content="Bob">
      </head><body></body></html>`;
      const meta = await adapter.getMetadata(makeFileSource(html));
      expect(meta.title).toBe("My Page");
      expect((meta.metaTags as Record<string, string>).author).toBe("Bob");
    });

    it("includes byteSize for file sources", async () => {
      const content = "<p>test</p>";
      const meta = await adapter.getMetadata(makeFileSource(content));
      expect(meta.byteSize).toBe(Buffer.from(content).length);
    });
  });

  // Article-length pages go through Mozilla Readability, which drops nav/footer
  // and (with our pre-cleaning) reference lists — so the corpus stores prose,
  // not citation chrome. (#317 / #319)
  describe("extract — Readability main content", () => {
    const ARTICLE_HTML = `<!doctype html>
<html><head><title>Understanding Widgets</title></head>
<body>
<nav><a href="/home">Home</a><a href="/about">About</a> Français Español</nav>
<article>
  <h1>Understanding Widgets</h1>
  <p>Widgets are small interface components that reduce cognitive load and
  improve clarity in dashboards. A well-designed widget surfaces a single
  metric and avoids burying it under unrelated controls, which is the most
  common failure mode in cluttered admin panels everywhere today.</p>
  <p>Widget composition matters: small widgets compose into panels, and panels
  compose into full dashboards. Keeping each widget focused lets teams
  rearrange layouts without rewriting data plumbing, and keeps render cost
  predictable across many concurrent dashboard views in production.</p>
  <p>Lifecycle is the third consideration. A widget should fetch lazily, cache
  sensibly, and degrade gracefully when its data source is slow, otherwise one
  stalled query can block an entire dashboard from painting on screen.</p>
  <p>Taken together, focus, composition, and lifecycle are the properties that
  separate a maintainable widget system from an unmaintainable one over the
  long life of a real product used by real teams.</p>
  <ol class="references">
    <li id="cite_note-1">^ "Why dashboards mislead". Journal of Confusion. 2024.</li>
    <li id="cite_note-2">^ a b c "The hidden cost of clutter". Noise Quarterly. 2025.</li>
  </ol>
</article>
<footer>© 2026 Widget Co. All rights reserved.</footer>
</body></html>`;

    it("keeps article prose and drops nav/footer + the reference list", async () => {
      const result = await adapter.extract(makeFileSource(ARTICLE_HTML));

      // Prose retained, Readability path taken.
      expect(result.text).toContain("Widgets are small interface components");
      expect(result.text).toContain("Lifecycle is the third consideration");
      expect(result.metadata.extractedVia).toBe("readability");

      // Reference list, citation backlinks, and footer chrome removed.
      expect(result.text).not.toMatch(/Journal of Confusion|Noise Quarterly/);
      expect(result.text).not.toMatch(/^\s*\^/m);
      expect(result.text).not.toContain("All rights reserved");
    });
  });
});
