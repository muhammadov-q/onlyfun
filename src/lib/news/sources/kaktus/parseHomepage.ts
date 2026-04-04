import * as cheerio from "cheerio";
import type { SourceArticlePreview } from "@/types/news";

const KAKTUS_BASE = "https://kaktus.media";

export function parseKaktusHomepage(html: string): SourceArticlePreview[] {
  const $ = cheerio.load(html);
  const articles: SourceArticlePreview[] = [];
  const seen = new Set<string>();

  $("a.Dashboard-Content-Card--name").each((_, el) => {
    const $el = $(el);
    const title = $el.text().trim();
    let url = $el.attr("href") ?? "";

    if (!title || !url) return;

    // Normalize URL
    if (url.startsWith("/")) {
      url = KAKTUS_BASE + url;
    }

    // Deduplicate by URL
    if (seen.has(url)) return;
    seen.add(url);

    articles.push({ title, url });
  });

  return articles;
}
