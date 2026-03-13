import { createCardConfig } from "../../domain-system";

/**
 * Core Domain Card Configuration
 * Evidence, Content, and File type cards
 *
 * Note: File cards use a custom component for upload functionality.
 * See app/graph-visualizer/components/domain-cards/FileCard.tsx
 */
export const evidenceCardConfig = createCardConfig()
  .field({
    property: "kind",
    label: "Evidence Kind",
    type: "badge",
    section: "overview",
  })
  .field({
    property: "title",
    label: "Title",
    type: "text",
    section: "overview",
  })
  .field({
    property: "publisher",
    label: "Publisher",
    type: "text",
    section: "overview",
  })
  .field({
    property: "date",
    label: "Date",
    type: "date",
    section: "temporal",
  })
  .field({
    property: "url",
    label: "URL",
    type: "link",
    section: "details",
  })
  .field({
    property: "reliability",
    label: "Reliability",
    type: "number",
    section: "quality",
  })
  .field({
    property: "notes",
    label: "Notes",
    type: "text",
    section: "details",
  })
  .section({
    id: "overview",
    title: "Overview",
    order: 1,
  })
  .section({
    id: "temporal",
    title: "Temporal",
    order: 2,
  })
  .section({
    id: "quality",
    title: "Quality",
    order: 3,
  })
  .section({
    id: "details",
    title: "Details",
    order: 4,
  })
  .build();

export const contentCardConfig = createCardConfig()
  .field({
    property: "content_type",
    label: "Content Type",
    type: "badge",
    section: "overview",
  })
  .field({
    property: "published_at",
    label: "Published",
    type: "date",
    section: "overview",
  })
  .field({
    property: "text_excerpt",
    label: "Excerpt",
    type: "text",
    section: "content",
  })
  .field({
    property: "platform_uid",
    label: "Platform",
    type: "text",
    section: "attribution",
  })
  .field({
    property: "author_uid",
    label: "Author",
    type: "text",
    section: "attribution",
  })
  .field({
    property: "url",
    label: "URL",
    type: "link",
    section: "content",
  })
  .section({
    id: "overview",
    title: "Overview",
    order: 1,
  })
  .section({
    id: "content",
    title: "Content",
    order: 2,
  })
  .section({
    id: "attribution",
    title: "Attribution",
    order: 3,
  })
  .build();

export const fileCardConfig = createCardConfig()
  .field({
    property: "mime",
    label: "MIME Type",
    type: "badge",
    section: "file_info",
  })
  .field({
    property: "bytes",
    label: "File Size",
    type: "number",
    section: "file_info",
  })
  .field({
    property: "content_hash",
    label: "Content Hash",
    type: "text",
    section: "verification",
  })
  .field({
    property: "bucket",
    label: "Bucket",
    type: "text",
    section: "storage",
  })
  .field({
    property: "key",
    label: "Key",
    type: "text",
    section: "storage",
  })
  .section({
    id: "file_info",
    title: "File Info",
    order: 1,
  })
  .section({
    id: "storage",
    title: "Storage",
    order: 2,
  })
  .section({
    id: "verification",
    title: "Verification",
    order: 3,
  })
  .build();
