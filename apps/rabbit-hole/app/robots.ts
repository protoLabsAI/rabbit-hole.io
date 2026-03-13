import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://rabbit-hole.io";

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/blog", "/blog/*", "/atlas", "/privacy", "/support"],
      disallow: [
        "/admin/*",
        "/api/*",
        "/_next/*",
        "/monitoring/*",
        "/*.json",
        "/test-*",
        "/evidence/*",
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
