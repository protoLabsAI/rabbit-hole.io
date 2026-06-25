import { defineConfig } from "vitepress";

// Docs IA follows the fleet's Diátaxis × domain pattern (see protoAgent / ORBIS):
//   - top level = the four Diátaxis modes (Tutorials / How-to / Reference / Explanation)
//   - within each mode, pages are grouped by DOMAIN (the sidebar groups below),
//     using one shared domain vocabulary that recurs across all four modes.
// Styling comes from @protolabsai/vitepress-theme with rabbit-hole's token
// overrides in .vitepress/theme/custom.css.

// Default base is "/" — docs ship to the subdomain root docs.rabbit-hole.io
// (Cloudflare Pages). DOCS_BASE can still override it (e.g. "/rabbit-hole.io/"
// for a GitHub Pages project-path build).
const base = process.env.DOCS_BASE || "/";

// Shared domain vocabulary — the same groups recur across every mode.
const D = {
  search: "Search",
  research: "Deep research",
  ingestion: "Ingestion & search backends",
  operate: "Operate & self-host",
};

export default defineConfig({
  title: "rabbit-hole.io",
  description:
    "A self-hostable AI search engine over the open web and your own files — docs for the search agent, deep research, ingestion, and self-hosting.",
  base,
  cleanUrls: true,
  lastUpdated: true,
  ignoreDeadLinks: "localhostLinks",

  head: [
    // Browser-tab favicon adapts to the OS scheme, same reasoning as the nav
    // logo: the mark is dark ink, so a dark tab bar needs the light variant.
    [
      "link",
      {
        rel: "icon",
        type: "image/svg+xml",
        href: `${base}favicon.svg`,
        media: "(prefers-color-scheme: light)",
      },
    ],
    [
      "link",
      {
        rel: "icon",
        type: "image/svg+xml",
        href: `${base}favicon-dark.svg`,
        media: "(prefers-color-scheme: dark)",
      },
    ],
    ["meta", { name: "theme-color", content: "#F8F7F4" }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:title", content: "rabbit-hole.io — docs" }],
    [
      "meta",
      {
        property: "og:description",
        content:
          "A self-hostable AI search engine over the open web and your own files.",
      },
    ],
    ["meta", { property: "og:image", content: "https://rabbit-hole.io/og-image.png" }],
    ["meta", { name: "twitter:card", content: "summary_large_image" }],
    ["meta", { name: "twitter:image", content: "https://rabbit-hole.io/og-image.png" }],
  ],

  themeConfig: {
    // Light/dark pair — the mark is dark ink, so it needs a light variant to be
    // visible on the dark theme.
    logo: { light: "/favicon.svg", dark: "/favicon-dark.svg" },

    nav: [
      { text: "Tutorials", link: "/tutorials/" },
      { text: "How-to", link: "/how-to/" },
      { text: "Reference", link: "/reference/" },
      { text: "Explanation", link: "/explanation/" },
    ],

    sidebar: {
      "/tutorials/": [
        { text: "Tutorials", items: [{ text: "Overview", link: "/tutorials/" }] },
        {
          text: D.search,
          collapsed: false,
          items: [{ text: "Your first search", link: "/tutorials/first-search" }],
        },
        {
          text: D.research,
          collapsed: false,
          items: [
            { text: "Your first deep research", link: "/tutorials/first-deep-research" },
          ],
        },
      ],

      "/how-to/": [
        { text: "How-to", items: [{ text: "Overview", link: "/how-to/" }] },
        {
          text: D.search,
          collapsed: false,
          items: [
            { text: "Search with categories", link: "/how-to/search-with-categories" },
          ],
        },
        {
          text: D.research,
          collapsed: false,
          items: [
            { text: "Use deep research modes", link: "/how-to/deep-research-modes" },
          ],
        },
        {
          text: D.ingestion,
          collapsed: false,
          items: [{ text: "Configure SearXNG", link: "/how-to/configure-searxng" }],
        },
        {
          text: D.operate,
          collapsed: false,
          items: [
            { text: "Host a public BYOK demo", link: "/how-to/host-byok-demo" },
          ],
        },
      ],

      "/reference/": [
        { text: "Reference", items: [{ text: "Overview", link: "/reference/" }] },
        {
          text: D.search,
          collapsed: false,
          items: [
            { text: "Search Chat API", link: "/reference/search-chat-api" },
            { text: "Search functions", link: "/reference/search-functions" },
            { text: "Middleware pipeline", link: "/reference/middleware-pipeline" },
          ],
        },
        {
          text: D.research,
          collapsed: false,
          items: [{ text: "Deep Research API", link: "/reference/deep-research-api" }],
        },
        {
          text: D.ingestion,
          collapsed: false,
          items: [{ text: "SearXNG configuration", link: "/reference/searxng-config" }],
        },
      ],

      "/explanation/": [
        { text: "Explanation", items: [{ text: "Overview", link: "/explanation/" }] },
        {
          text: D.search,
          collapsed: false,
          items: [
            { text: "Search agent design", link: "/explanation/search-agent-design" },
            { text: "Search architecture", link: "/explanation/search-architecture" },
          ],
        },
        {
          text: D.research,
          collapsed: false,
          items: [
            { text: "Deep research pipeline", link: "/explanation/deep-research-pipeline" },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: "github", link: "https://github.com/protoLabsAI/rabbit-hole.io" },
    ],

    search: { provider: "local" },

    editLink: {
      pattern: "https://github.com/protoLabsAI/rabbit-hole.io/edit/main/docs/:path",
      text: "Edit this page on GitHub",
    },

    footer: {
      message: "Part of the protoLabs autonomous development studio.",
      copyright: "© 2026 protoLabs.studio",
    },
  },
});
