import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Rabbit Hole",
  description:
    "AI-powered search engine with a living knowledge graph — deep research, citations, and SearXNG-backed web search.",
  base: "/rabbit-hole.io/",

  head: [["link", { rel: "icon", href: "/rabbit-hole.io/favicon.svg" }]],

  themeConfig: {
    logo: "/favicon.svg",

    nav: [
      { text: "Tutorials", link: "/tutorials/" },
      { text: "How-to", link: "/how-to/" },
      { text: "Reference", link: "/reference/" },
      { text: "Explanation", link: "/explanation/" },
    ],

    sidebar: {
      "/tutorials/": [
        {
          text: "Tutorials",
          items: [
            { text: "Overview", link: "/tutorials/" },
            {
              text: "Your first search",
              link: "/tutorials/first-search",
            },
            {
              text: "Your first deep research",
              link: "/tutorials/first-deep-research",
            },
          ],
        },
      ],

      "/how-to/": [
        {
          text: "How-to Guides",
          items: [
            { text: "Overview", link: "/how-to/" },
            {
              text: "Search with categories",
              link: "/how-to/search-with-categories",
            },
            {
              text: "Use deep research modes",
              link: "/how-to/deep-research-modes",
            },
            {
              text: "Ingest to knowledge graph",
              link: "/how-to/ingest-to-graph",
            },
            {
              text: "Configure SearXNG",
              link: "/how-to/configure-searxng",
            },
          ],
        },
      ],

      "/reference/": [
        {
          text: "Reference",
          items: [
            { text: "Overview", link: "/reference/" },
            {
              text: "Search Chat API",
              link: "/reference/search-chat-api",
            },
            {
              text: "Deep Research API",
              link: "/reference/deep-research-api",
            },
            {
              text: "Search functions",
              link: "/reference/search-functions",
            },
            {
              text: "Middleware pipeline",
              link: "/reference/middleware-pipeline",
            },
            {
              text: "SearXNG configuration",
              link: "/reference/searxng-config",
            },
          ],
        },
      ],

      "/explanation/": [
        {
          text: "Explanation",
          items: [
            { text: "Overview", link: "/explanation/" },
            {
              text: "Search agent design",
              link: "/explanation/search-agent-design",
            },
            {
              text: "Deep research pipeline",
              link: "/explanation/deep-research-pipeline",
            },
            {
              text: "Graph and web search",
              link: "/explanation/graph-web-relationship",
            },
          ],
        },
      ],
    },

    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/protoLabsAI/rabbit-hole.io",
      },
    ],

    search: {
      provider: "local",
    },

    footer: {
      message: "Part of the protoLabs autonomous development studio.",
      copyright: "© 2026 protoLabs.studio",
    },
  },
});
