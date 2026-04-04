import { fetchKaktusHomepage } from "@/lib/news/sources/kaktus/fetchHomepage";
import { parseKaktusHomepage } from "@/lib/news/sources/kaktus/parseHomepage";
import { fetchKaktusArticle } from "@/lib/news/sources/kaktus/fetchArticle";
import { parseKaktusArticle } from "@/lib/news/sources/kaktus/parseArticle";
import { filterRelevantItems } from "@/lib/news/filter";
import { summarizeWithGemini } from "@/lib/news/summarize";
import { fallbackSummarize } from "@/lib/news/fallbackSummarizer";
import { setCachedFeed } from "@/lib/news/cache";
import type { RawNewsItem, FeedItem } from "@/types/news";

const MAX_ARTICLES_TO_FETCH = 15;
const MAX_FEED_ITEMS = 10;

export type IngestResult = {
  items: FeedItem[];
  meta: {
    totalPreviews: number;
    totalParsed: number;
    totalRelevant: number;
    totalFeed: number;
    errors?: string[];
  };
  error?: string;
};

export async function runIngest(): Promise<IngestResult> {
  const errors: string[] = [];

  // 1. Fetch and parse homepage
  let homepageHtml: string;
  try {
    homepageHtml = await fetchKaktusHomepage();
  } catch (e) {
    return {
      items: [],
      meta: { totalPreviews: 0, totalParsed: 0, totalRelevant: 0, totalFeed: 0 },
      error: `Failed to fetch Kaktus homepage: ${String(e)}`,
    };
  }

  const previews = parseKaktusHomepage(homepageHtml);
  if (previews.length === 0) {
    return {
      items: [],
      meta: { totalPreviews: 0, totalParsed: 0, totalRelevant: 0, totalFeed: 0 },
      error: "No articles found on Kaktus homepage",
    };
  }

  // 2. Fetch and parse individual articles
  const articlesToFetch = previews.slice(0, MAX_ARTICLES_TO_FETCH);
  const rawItems: RawNewsItem[] = [];

  const results = await Promise.allSettled(
    articlesToFetch.map(async (preview) => {
      const html = await fetchKaktusArticle(preview.url);
      return parseKaktusArticle(html, preview.url);
    })
  );

  for (const result of results) {
    if (result.status === "fulfilled" && result.value) {
      rawItems.push(result.value);
    } else if (result.status === "rejected") {
      errors.push(String(result.reason));
    }
  }

  if (rawItems.length === 0) {
    return {
      items: [],
      meta: {
        totalPreviews: previews.length,
        totalParsed: 0,
        totalRelevant: 0,
        totalFeed: 0,
        errors,
      },
      error: "No articles could be parsed",
    };
  }

  // 3. Filter for relevance
  const relevant = filterRelevantItems(rawItems, MAX_FEED_ITEMS);

  if (relevant.length === 0) {
    return {
      items: [],
      meta: {
        totalPreviews: previews.length,
        totalParsed: rawItems.length,
        totalRelevant: 0,
        totalFeed: 0,
      },
    };
  }

  // 4. Summarize with Gemini (with fallback)
  const feedItems: FeedItem[] = [];

  const summaryResults = await Promise.allSettled(
    relevant.map(async ({ item }) => {
      let summary;
      try {
        summary = await summarizeWithGemini(item);
      } catch (e) {
        errors.push(`Gemini failed for "${item.title}": ${String(e)}`);
        summary = null;
      }

      if (!summary) {
        summary = fallbackSummarize(item);
      }

      const id = item.url.match(/doc\/(\d+)/)?.[1] ?? String(Date.now());

      return {
        id,
        source: "kaktus" as const,
        sourceUrl: item.url,
        headline: summary.headline,
        headlineRu: summary.headlineRu,
        line1: summary.line1,
        line1Ru: summary.line1Ru,
        line2: summary.line2,
        line2Ru: summary.line2Ru,
        topicSuggestion: summary.topicSuggestion,
        topicSuggestionRu: summary.topicSuggestionRu,
        modeSuggestion: summary.modeSuggestion,
        publishedAt: item.publishedAt,
      } satisfies FeedItem;
    })
  );

  for (const result of summaryResults) {
    if (result.status === "fulfilled") {
      feedItems.push(result.value);
    }
  }

  // 5. Cache results
  setCachedFeed(feedItems);

  return {
    items: feedItems,
    meta: {
      totalPreviews: previews.length,
      totalParsed: rawItems.length,
      totalRelevant: relevant.length,
      totalFeed: feedItems.length,
      errors: errors.length > 0 ? errors : undefined,
    },
  };
}
