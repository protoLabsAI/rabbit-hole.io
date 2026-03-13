import { describe, expect, it } from "vitest";

import type { FileSource } from "@proto/types";

import { MarkdownAdapter } from "../markdown-adapter.js";

function makeFileSource(
  content: string,
  mediaType = "text/markdown"
): FileSource {
  return {
    type: "file",
    buffer: Buffer.from(content, "utf-8"),
    mediaType,
  };
}

describe("MarkdownAdapter", () => {
  const adapter = new MarkdownAdapter();

  describe("canHandle", () => {
    it("returns true for text/markdown", () => {
      expect(adapter.canHandle(makeFileSource("# hi", "text/markdown"))).toBe(
        true
      );
    });

    it("returns true for text/x-markdown", () => {
      expect(adapter.canHandle(makeFileSource("# hi", "text/x-markdown"))).toBe(
        true
      );
    });

    it("returns false for text/plain", () => {
      expect(adapter.canHandle(makeFileSource("# hi", "text/plain"))).toBe(
        false
      );
    });

    it("returns false for text/html", () => {
      expect(adapter.canHandle(makeFileSource("# hi", "text/html"))).toBe(
        false
      );
    });
  });

  describe("extract — frontmatter", () => {
    it("parses YAML frontmatter key-value pairs", async () => {
      const md = `---
title: My Document
author: Alice
---
Hello world`;
      const result = await adapter.extract(makeFileSource(md));
      expect(result.metadata.frontmatter).toEqual({
        title: "My Document",
        author: "Alice",
      });
    });

    it("strips frontmatter from the plain text output", async () => {
      const md = `---
title: Hidden
---
Visible content`;
      const result = await adapter.extract(makeFileSource(md));
      expect(result.text).not.toContain("Hidden");
      expect(result.text).toContain("Visible content");
    });

    it("handles documents without frontmatter", async () => {
      const result = await adapter.extract(makeFileSource("# Hello\n\nWorld"));
      expect(result.metadata.frontmatter).toEqual({});
    });
  });

  describe("extract — headings", () => {
    it("extracts ATX headings at all levels", async () => {
      const md = `# H1\n## H2\n### H3`;
      const result = await adapter.extract(makeFileSource(md));
      expect(result.metadata.headings).toEqual(["H1", "H2", "H3"]);
    });

    it("returns empty headings array when none present", async () => {
      const result = await adapter.extract(makeFileSource("just text"));
      expect(result.metadata.headings).toEqual([]);
    });
  });

  describe("extract — links", () => {
    it("extracts markdown links", async () => {
      const md = `Check [this](https://example.com) and [that](https://test.io)`;
      const result = await adapter.extract(makeFileSource(md));
      expect(result.metadata.links).toEqual([
        { text: "this", url: "https://example.com" },
        { text: "that", url: "https://test.io" },
      ]);
    });

    it("returns empty links array when none present", async () => {
      const result = await adapter.extract(makeFileSource("no links here"));
      expect(result.metadata.links).toEqual([]);
    });
  });

  describe("extract — plain text conversion", () => {
    it("strips heading markers", async () => {
      const result = await adapter.extract(makeFileSource("# Hello World"));
      expect(result.text).toBe("Hello World");
    });

    it("preserves link text while removing URL", async () => {
      const result = await adapter.extract(
        makeFileSource("See [docs](https://example.com)")
      );
      expect(result.text).toContain("docs");
      expect(result.text).not.toContain("https://example.com");
    });

    it("removes fenced code blocks", async () => {
      const md = "Before\n```js\nconsole.log('hi')\n```\nAfter";
      const result = await adapter.extract(makeFileSource(md));
      expect(result.text).not.toContain("console.log");
      expect(result.text).toContain("Before");
      expect(result.text).toContain("After");
    });
  });

  describe("extract — metadata", () => {
    it("sets category to 'document'", async () => {
      const result = await adapter.extract(makeFileSource("# Hello"));
      expect(result.category).toBe("document");
    });

    it("includes wordCount in metadata", async () => {
      const result = await adapter.extract(makeFileSource("one two three"));
      expect(result.metadata.wordCount).toBe(3);
    });

    it("returns empty artifacts array", async () => {
      const result = await adapter.extract(makeFileSource("hello"));
      expect(result.artifacts).toEqual([]);
    });
  });

  describe("getMetadata", () => {
    it("returns frontmatter and headings", async () => {
      const md = `---
title: Test
---
# Section One`;
      const meta = await adapter.getMetadata(makeFileSource(md));
      expect((meta.frontmatter as Record<string, unknown>).title).toBe("Test");
      expect(meta.headings).toEqual(["Section One"]);
      expect(meta.headingCount).toBe(1);
    });
  });
});
