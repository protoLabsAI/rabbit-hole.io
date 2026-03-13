import { describe, test, expect } from "vitest";

import { processFileMetadata, generateEntityIdFromFilename } from "../metadata";

describe("processFileMetadata", () => {
  // Mock File objects for testing
  const createMockFile = (
    name: string,
    size: number,
    type: string,
    lastModified?: number
  ) => {
    const content = new ArrayBuffer(size);
    const file = new File([content], name, {
      type,
      lastModified: lastModified || Date.now(),
    });

    // Override size property to match expected value
    Object.defineProperty(file, "size", {
      value: size,
      writable: false,
    });

    return file;
  };

  test("extracts basic file metadata correctly", async () => {
    const file = createMockFile(
      "test-document.pdf",
      1024 * 1024,
      "application/pdf"
    );
    const result = await processFileMetadata(file);

    expect(result.filename).toBe("test-document.pdf");
    expect(result.originalFilename).toBe("test-document.pdf");
    expect(result.size).toBe(1024 * 1024);
    expect(result.sizeFormatted).toBe("1.0 MB");
    expect(result.mediaType).toBe("application/pdf");
    expect(result.isValid).toBe(true);
    expect(result.validationErrors).toEqual([]);
  });

  test("generates valid entity IDs from filenames", async () => {
    const file = createMockFile(
      "My Document File.pdf",
      1024,
      "application/pdf"
    );
    const result = await processFileMetadata(file);

    expect(result.suggestedEntityId).toBe("file:my_document_file");
    expect(result.suggestedEntityId).toMatch(/^file:[a-z0-9_]+$/);
  });

  test("handles special characters in filenames", async () => {
    const file = createMockFile(
      "Report@2024#Final%Version.docx",
      1024,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    const result = await processFileMetadata(file);

    expect(result.suggestedEntityId).toBe("file:report_2024_final_version");
    expect(result.suggestedEntityId).not.toContain("@");
    expect(result.suggestedEntityId).not.toContain("#");
    expect(result.suggestedEntityId).not.toContain("%");
  });

  test("validates file types and sizes", async () => {
    const oversizedFile = createMockFile(
      "huge.pdf",
      200 * 1024 * 1024,
      "application/pdf"
    ); // 200MB
    const result = await processFileMetadata(oversizedFile);

    expect(result.isValid).toBe(false);
    expect(result.validationErrors).toContain(
      "File size exceeds maximum limit of 100 MB"
    );
  });

  test("handles empty or invalid filenames", async () => {
    const file = createMockFile("", 1024, "application/pdf");
    const result = await processFileMetadata(file);

    expect(result.suggestedEntityId).toBe("file:unknown_file");
    expect(result.isValid).toBe(false);
    expect(result.validationErrors).toContain("Filename cannot be empty");
  });

  test("computes content hash when enabled", async () => {
    const file = createMockFile("test.txt", 1024, "text/plain");
    const result = await processFileMetadata(file, { computeHash: true });

    expect(result.contentHash).toMatch(/^sha256-[a-f0-9]{64}$/);
  });

  test("handles invalid files gracefully", async () => {
    const invalidFile = createMockFile(
      "virus.exe",
      1024,
      "application/x-executable"
    );
    const result = await processFileMetadata(invalidFile);

    expect(result.isValid).toBe(false);
    expect(result.validationErrors).toContain(
      "File type not allowed: application/x-executable"
    );
  });

  test("extracts last modified date", async () => {
    const lastModified = new Date("2024-01-15T10:30:00Z").getTime();
    const file = createMockFile(
      "test.pdf",
      1024,
      "application/pdf",
      lastModified
    );
    const result = await processFileMetadata(file);

    expect(result.lastModified).toEqual(new Date(lastModified));
  });

  test("formats file sizes correctly", async () => {
    const testCases = [
      { size: 500, expected: "500 B" },
      { size: 1024, expected: "1.0 KB" },
      { size: 1536, expected: "1.5 KB" },
      { size: 1024 * 1024, expected: "1.0 MB" },
      { size: 1024 * 1024 * 2.5, expected: "2.5 MB" },
    ];

    for (const { size, expected } of testCases) {
      const file = createMockFile("test.pdf", size, "application/pdf");
      const result = await processFileMetadata(file);
      expect(result.sizeFormatted).toBe(expected);
    }
  });
});

describe("generateEntityIdFromFilename", () => {
  test("generates clean entity IDs from simple filenames", () => {
    expect(generateEntityIdFromFilename("document.pdf")).toBe("file:document");
    expect(generateEntityIdFromFilename("report.docx")).toBe("file:report");
    expect(generateEntityIdFromFilename("image.jpg")).toBe("file:image");
  });

  test("handles complex filenames with spaces and special characters", () => {
    expect(generateEntityIdFromFilename("My Important Document.pdf")).toBe(
      "file:my_important_document"
    );
    expect(generateEntityIdFromFilename("Report-2024@Final#Version.docx")).toBe(
      "file:report_2024_final_version"
    );
    expect(generateEntityIdFromFilename("FILE_NAME_WITH_CAPS.txt")).toBe(
      "file:file_name_with_caps"
    );
  });

  test("handles very long filenames", () => {
    const longName =
      "This_is_a_very_long_filename_that_exceeds_normal_length_limits_and_should_be_truncated_appropriately.pdf";
    const result = generateEntityIdFromFilename(longName);

    expect(result).toMatch(/^file:/);
    expect(result.length).toBeLessThanOrEqual(64); // Reasonable limit
    expect(result).toBe("file:this_is_a_very_long_filename_that_exceeds_nor");
  });

  test("handles empty or invalid filenames", () => {
    expect(generateEntityIdFromFilename("")).toBe("file:unknown_file");
    expect(generateEntityIdFromFilename("   ")).toBe("file:unknown_file");
    expect(generateEntityIdFromFilename("...")).toBe("file:unknown_file");
  });

  test("removes file extensions properly", () => {
    expect(generateEntityIdFromFilename("document.pdf")).toBe("file:document");
    expect(generateEntityIdFromFilename("archive.tar.gz")).toBe(
      "file:archive_tar"
    );
    expect(generateEntityIdFromFilename("script.js.map")).toBe(
      "file:script_js"
    );
  });

  test("ensures unique entity IDs for similar names", () => {
    const names = [
      "Document.pdf",
      "document.PDF",
      "DOCUMENT.pdf",
      "document (1).pdf",
    ];

    const ids = names.map(generateEntityIdFromFilename);

    // All should start with file: and be lowercase
    ids.forEach((id) => {
      expect(id).toMatch(/^file:[a-z0-9_]+$/);
    });

    // Base names should be similar but distinguishable
    expect(ids[0]).toBe("file:document");
    expect(ids[1]).toBe("file:document");
    expect(ids[2]).toBe("file:document");
    expect(ids[3]).toBe("file:document_1");
  });
});
