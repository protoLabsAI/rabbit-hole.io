/**
 * Document Adapter Registry
 *
 * Imports and registers all document-type MediaAdapters with the shared
 * adapterRegistry singleton. Import this module at startup to activate
 * text, markdown, HTML, and audio ingestion support.
 */

import {
  SimpleAdapterRegistry,
  adapterRegistry,
  type AdapterRegistry,
} from "../../jobs/MediaIngestionJob.js";

import { AudioAdapter } from "./audio-adapter.js";
import { HtmlAdapter } from "./html-adapter.js";
import { MarkdownAdapter } from "./markdown-adapter.js";
import { TextAdapter } from "./text-adapter.js";
import { VideoAdapter } from "./video-adapter.js";

/**
 * Build a fully-populated adapter registry. Used by MediaIngestionJob.run()
 * so the worker thread gets a registry independent of module-singleton
 * identity (Sidequest worker threads may load MediaIngestionJob under a
 * different module instance than this file's `adapterRegistry`, leaving the
 * shared singleton empty in the job's context).
 */
export function buildAdapterRegistry(): AdapterRegistry {
  const registry = new SimpleAdapterRegistry();
  registry.register(new TextAdapter());
  registry.register(new MarkdownAdapter());
  registry.register(new HtmlAdapter());
  registry.register(new AudioAdapter());
  registry.register(new VideoAdapter());
  return registry;
}

// Also populate the shared singleton for the main-process startup path.
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
