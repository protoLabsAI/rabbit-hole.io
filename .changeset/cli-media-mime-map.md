---
"@protolabsai/rabbit-hole-cli": patch
---

feat(ingest): auto-detect more media types by extension — PPTX, XLSX, CSV, RTF, ODT/ODP/ODS, and images (PNG/JPG/GIF/TIFF/BMP/WEBP). `rh ingest file.pptx` (or a URL) now sends the right MIME type so the job-processor's Office/image-OCR adapters resolve without an explicit `--media-type`.
