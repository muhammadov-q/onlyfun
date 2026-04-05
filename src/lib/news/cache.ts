import { getDb } from "@/lib/db";
import type { FeedItem } from "@/types/news";
import type { RoomModeId } from "@/types/room";

const NEWS_FEED_TTL_MS =
  (parseInt(process.env.NEWS_FEED_TTL_MINUTES ?? "30", 10) || 30) * 60 * 1000;

export async function getCachedFeed(): Promise<{ items: FeedItem[]; fresh: boolean }> {
  const sql = getDb();

  // Fetch visible items regardless of age
  const rows = await sql`
    SELECT * FROM news_feed_items
    WHERE visible = TRUE
    ORDER BY created_at DESC
    LIMIT 10
  `;

  const items = rows.map(rowToFeedItem);

  // Check if last ingest is still fresh (controls whether re-ingest is needed)
  const log = await sql`SELECT ran_at FROM news_ingest_log ORDER BY ran_at DESC LIMIT 1`;
  const lastRan = log[0]?.ran_at ? new Date(log[0].ran_at).getTime() : 0;
  const fresh = Date.now() - lastRan <= NEWS_FEED_TTL_MS;

  return { items, fresh };
}

export async function setCachedFeed(items: FeedItem[]): Promise<void> {
  const sql = getDb();

  // Clear old items and insert new ones
  await sql`DELETE FROM news_feed_items`;

  for (const item of items) {
    await sql`
      INSERT INTO news_feed_items (
        id, source, source_url,
        headline, headline_ru,
        line1, line1_ru,
        line2, line2_ru,
        topic_suggestion, topic_suggestion_ru,
        mode_suggestion, published_at, created_at
      ) VALUES (
        ${item.id}, ${item.source}, ${item.sourceUrl},
        ${item.headline}, ${item.headlineRu},
        ${item.line1}, ${item.line1Ru},
        ${item.line2}, ${item.line2Ru},
        ${item.topicSuggestion}, ${item.topicSuggestionRu},
        ${item.modeSuggestion}, ${item.publishedAt ?? null}, NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        headline = EXCLUDED.headline,
        headline_ru = EXCLUDED.headline_ru,
        line1 = EXCLUDED.line1,
        line1_ru = EXCLUDED.line1_ru,
        line2 = EXCLUDED.line2,
        line2_ru = EXCLUDED.line2_ru,
        topic_suggestion = EXCLUDED.topic_suggestion,
        topic_suggestion_ru = EXCLUDED.topic_suggestion_ru,
        mode_suggestion = EXCLUDED.mode_suggestion,
        created_at = NOW()
    `;
  }

  // Log the ingest
  await sql`INSERT INTO news_ingest_log (ran_at, items_count) VALUES (NOW(), ${items.length})`;
}

export async function isCacheStale(): Promise<boolean> {
  const sql = getDb();
  const log = await sql`SELECT ran_at FROM news_ingest_log ORDER BY ran_at DESC LIMIT 1`;

  if (!log[0]?.ran_at) return true;
  return Date.now() - new Date(log[0].ran_at).getTime() > NEWS_FEED_TTL_MS;
}

function rowToFeedItem(row: Record<string, unknown>): FeedItem {
  return {
    id: row.id as string,
    source: row.source as "kaktus",
    sourceUrl: row.source_url as string,
    headline: row.headline as string,
    headlineRu: row.headline_ru as string,
    line1: row.line1 as string,
    line1Ru: row.line1_ru as string,
    line2: row.line2 as string,
    line2Ru: row.line2_ru as string,
    topicSuggestion: row.topic_suggestion as string,
    topicSuggestionRu: row.topic_suggestion_ru as string,
    modeSuggestion: row.mode_suggestion as RoomModeId,
    publishedAt: row.published_at ? (row.published_at as string) : undefined,
  };
}
