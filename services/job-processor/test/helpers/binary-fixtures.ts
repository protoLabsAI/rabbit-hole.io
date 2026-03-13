/**
 * Binary fixture helpers for PDF and DOCX test files.
 *
 * These helpers create minimal but structurally valid binary files
 * entirely from Node.js built-ins — no external tools required.
 */

import { createHash } from "crypto";

// ==================== Minimal PDF ====================

/**
 * Build a minimal 1-page PDF with a single line of text.
 * All cross-reference byte offsets are computed programmatically
 * so the structure is always internally consistent.
 */
export function buildMinimalPdf(text = "Hello PDF"): Buffer {
  const streamContent = `BT /F1 12 Tf 72 720 Td (${text}) Tj ET`;
  const streamLen = Buffer.byteLength(streamContent, "latin1");

  // PDF objects (in order; each ends with a newline when appended to body)
  const objs: string[] = [
    "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj",
    "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj",
    "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj",
    `4 0 obj<</Length ${streamLen}>>\nstream\n${streamContent}\nendstream\nendobj`,
    "5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj",
  ];

  const header = "%PDF-1.4\n";

  // Accumulate body and record per-object byte offsets
  let body = "";
  const offsets: number[] = [];
  let offset = Buffer.byteLength(header, "latin1");

  for (const obj of objs) {
    offsets.push(offset);
    const line = obj + "\n";
    body += line;
    offset += Buffer.byteLength(line, "latin1");
  }

  const xrefStart = Buffer.byteLength(header + body, "latin1");
  const totalObjs = objs.length + 1; // +1 for the free object (0)

  // xref entries must be exactly 20 bytes each; use SP+CRLF as EOL
  const freeEntry = "0000000000 65535 f \r\n";
  const inUseEntries = offsets
    .map((o) => `${String(o).padStart(10, "0")} 00000 n \r\n`)
    .join("");

  const xref = [
    "xref\n",
    `0 ${totalObjs}\n`,
    freeEntry,
    inUseEntries,
    `trailer<</Size ${totalObjs}/Root 1 0 R>>\n`,
    "startxref\n",
    `${xrefStart}\n`,
    "%%EOF\n",
  ].join("");

  return Buffer.concat([
    Buffer.from(header + body, "latin1"),
    Buffer.from(xref, "latin1"),
  ]);
}

// ==================== Minimal DOCX ====================

/**
 * Build a minimal valid DOCX (Office Open XML) containing one paragraph.
 * A DOCX is a ZIP archive; we construct the ZIP format manually using
 * Node.js Buffers and CRC-32 from Node's built-in `zlib` module.
 */
export function buildMinimalDocx(paragraphText = "Hello DOCX"): Buffer {
  // Required DOCX files (uncompressed / stored)
  const files: Array<{ name: string; data: string }> = [
    {
      name: "[Content_Types].xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
    },
    {
      name: "_rels/.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    },
    {
      name: "word/document.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>${paragraphText}</w:t></w:r></w:p></w:body></w:document>`,
    },
    {
      name: "word/_rels/document.xml.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`,
    },
  ];

  return createZipBuffer(files);
}

// ==================== ZIP builder ====================

/** Compute CRC-32 of a buffer without requiring external packages. */
function computeCrc32(data: Buffer): number {
  // CRC-32 table (polynomial 0xEDB88320)
  const table = makeCrcTable();
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ data[i]!) & 0xff]!;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

let _crcTable: Uint32Array | undefined;
function makeCrcTable(): Uint32Array {
  if (_crcTable) return _crcTable;
  _crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    _crcTable[i] = c;
  }
  return _crcTable;
}

function u16le(v: number): Buffer {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(v, 0);
  return b;
}

function u32le(v: number): Buffer {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(v >>> 0, 0);
  return b;
}

/** Create a ZIP archive (stored, no compression) from an array of {name, data} entries. */
function createZipBuffer(files: Array<{ name: string; data: string }>): Buffer {
  const localBlocks: Buffer[] = [];
  const centralEntries: Buffer[] = [];
  let localOffset = 0;

  for (const file of files) {
    const nameBytes = Buffer.from(file.name, "utf8");
    const dataBytes = Buffer.from(file.data, "utf8");
    const crc = computeCrc32(dataBytes);
    const size = dataBytes.length;

    // Local file header (30 + nameLen + dataLen bytes)
    const localHeader = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x03, 0x04]), // Local file header signature
      u16le(20), // version needed to extract
      u16le(0), // general purpose bit flag
      u16le(0), // compression method: stored
      u16le(0), // last mod file time
      u16le(0), // last mod file date
      u32le(crc), // CRC-32
      u32le(size), // compressed size
      u32le(size), // uncompressed size
      u16le(nameBytes.length), // file name length
      u16le(0), // extra field length
      nameBytes,
      dataBytes,
    ]);

    // Central directory entry
    const centralEntry = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x01, 0x02]), // Central directory signature
      u16le(20), // version made by
      u16le(20), // version needed to extract
      u16le(0), // general purpose bit flag
      u16le(0), // compression method
      u16le(0), // last mod file time
      u16le(0), // last mod file date
      u32le(crc), // CRC-32
      u32le(size), // compressed size
      u32le(size), // uncompressed size
      u16le(nameBytes.length), // file name length
      u16le(0), // extra field length
      u16le(0), // file comment length
      u16le(0), // disk number start
      u16le(0), // internal file attributes
      u32le(0), // external file attributes
      u32le(localOffset), // relative offset of local header
      nameBytes,
    ]);

    localBlocks.push(localHeader);
    centralEntries.push(centralEntry);
    localOffset += localHeader.length;
  }

  const centralDirStart = localOffset;
  const centralDirSize = centralEntries.reduce((s, b) => s + b.length, 0);

  // End of central directory record
  const eocd = Buffer.concat([
    Buffer.from([0x50, 0x4b, 0x05, 0x06]), // EOCD signature
    u16le(0), // disk number
    u16le(0), // disk with start of central directory
    u16le(files.length), // entries on this disk
    u16le(files.length), // total entries
    u32le(centralDirSize), // size of central directory
    u32le(centralDirStart), // offset of central directory
    u16le(0), // comment length
  ]);

  return Buffer.concat([...localBlocks, ...centralEntries, eocd]);
}

// ==================== Corrupt buffer helpers ====================

export const CORRUPT_PDF_BUFFER = Buffer.from(
  "this is definitely not a valid PDF file",
  "utf8"
);

export const CORRUPT_DOCX_BUFFER = Buffer.from(
  "this is definitely not a valid DOCX file",
  "utf8"
);

// ==================== Content hash ====================

export function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}
