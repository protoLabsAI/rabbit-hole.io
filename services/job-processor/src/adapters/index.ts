/**
 * Document Adapter Registry
 *
 * Imports and registers all document-type MediaAdapters with the shared
 * adapterRegistry singleton. Import this module at startup to activate
 * text, markdown, HTML, and audio ingestion support.
 */

import { adapterRegistry } from "../../jobs/MediaIngestionJob.js";

import { AudioAdapter } from "./audio-adapter.js";
import { HtmlAdapter } from "./html-adapter.js";
import { MarkdownAdapter } from "./markdown-adapter.js";
import { TextAdapter } from "./text-adapter.js";
import { VideoAdapter } from "./video-adapter.js";

adapterRegistry.register(new TextAdapter());
adapterRegistry.register(new MarkdownAdapter());
adapterRegistry.register(new HtmlAdapter());
adapterRegistry.register(new AudioAdapter());
adapterRegistry.register(new VideoAdapter());

export {
  AudioAdapter,
  HtmlAdapter,
  MarkdownAdapter,
  TextAdapter,
  VideoAdapter,
};
