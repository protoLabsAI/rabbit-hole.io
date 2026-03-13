/**
 * File Tools Tests
 */

import { describe, it, expect } from "vitest";

import { readFile, writeFile, ls } from "../builtin-tools.js";

describe("File Tools", () => {
  describe("writeFile", () => {
    it("writes file to state", async () => {
      const result = await writeFile.invoke(
        {
          path: "/workspace/test.json",
          content: '{"foo": "bar"}',
        },
        { toolCall: { id: "test_write" } }
      );

      expect(result.update.files).toEqual({
        "/workspace/test.json": '{"foo": "bar"}',
      });
      expect(result.update.messages[0].content).toContain(
        "File written to /workspace/test.json"
      );
    });
  });

  describe("readFile", () => {
    it("reads existing file", async () => {
      const config = {
        toolCall: { id: "test_read" },
        state: {
          files: {
            "/workspace/data.json": '{"test": true}',
          },
        },
      };

      const result = await readFile.invoke(
        { path: "/workspace/data.json" },
        config
      );

      expect(result.update.messages[0].content).toBe('{"test": true}');
    });

    it("throws error for missing file", async () => {
      const config = {
        toolCall: { id: "test_read" },
        state: {
          files: {},
        },
      };

      await expect(
        readFile.invoke({ path: "/workspace/missing.json" }, config)
      ).rejects.toThrow("File not found: /workspace/missing.json");
    });
  });

  describe("ls", () => {
    it("lists all files", async () => {
      const config = {
        toolCall: { id: "test_ls" },
        state: {
          files: {
            "/workspace/file1.json": "{}",
            "/workspace/file2.json": "{}",
            "/workspace/subdir/file3.json": "{}",
          },
        },
      };

      const result = await ls.invoke({}, config);

      expect(result.update.messages[0].content).toContain(
        "/workspace/file1.json"
      );
      expect(result.update.messages[0].content).toContain(
        "/workspace/file2.json"
      );
      expect(result.update.messages[0].content).toContain(
        "/workspace/subdir/file3.json"
      );
    });

    it("returns 'No files' when workspace is empty", async () => {
      const config = {
        toolCall: { id: "test_ls" },
        state: {
          files: {},
        },
      };

      const result = await ls.invoke({}, config);

      expect(result.update.messages[0].content).toBe("No files");
    });
  });
});
