import type { MetadataRoute } from "next";

const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.shaheen-kw.com").replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["", "/templates", "/terms", "/privacy", "/refund", "/content-policy"];
  return pages.map((p) => ({ url: `${site}${p}`, changeFrequency: "weekly", priority: p === "" ? 1 : 0.5 }));
}
