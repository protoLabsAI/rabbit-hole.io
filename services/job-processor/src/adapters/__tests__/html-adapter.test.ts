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
});
