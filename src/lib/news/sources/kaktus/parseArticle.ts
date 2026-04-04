import * as cheerio from "cheerio";
import type { RawNewsItem } from "@/types/news";

export function parseKaktusArticle(html: string, url: string): RawNewsItem | null {
  const $ = cheerio.load(html);

  const title =
    $('h1.Article--title span[itemprop="headline"]').text().trim() ||
    $("h1.Article--title").text().trim();

  if (!title) return null;

  const publishedAt = $("time.Article--createAt").attr("datetime") || undefined;

  const category = $("a.Article--category-link").first().text().trim() || undefined;

  // Extract body text from article content
  const $body = $("div.Article--text div.BbCode");

  // Remove scripts, styles, iframes, ads
  $body.find("script, style, iframe, .Article--ad, .BbCode--video").remove();

  const bodyText = $body
    .find("p, h2, h3, li")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter((t) => t.length > 0)
    .join("\n");

  if (!bodyText || bodyText.length < 50) return null;

  return {
    source: "kaktus",
    title,
    url,
    publishedAt,
    category,
    bodyText,
  };
}
