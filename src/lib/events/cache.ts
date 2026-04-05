import { getDb } from "@/lib/db";
import type { SidebarEventItem } from "@/types/events";
import type { RoomModeId } from "@/types/room";

const EVENTS_CACHE_TTL_MS =
  (parseInt(process.env.EVENTS_CACHE_TTL_MINUTES ?? "20", 10) || 20) * 60 * 1000;

// In-memory cache for fast reads
let cachedEvents: SidebarEventItem[] | null = null;
let cacheTimestamp = 0;

export function getCachedEvents(): SidebarEventItem[] | null {
  if (!cachedEvents || cachedEvents.length === 0) return null;
  if (Date.now() - cacheTimestamp > EVENTS_CACHE_TTL_MS) return null;
  return cachedEvents;
}

export function setCachedEvents(items: SidebarEventItem[]): void {
  cachedEvents = items;
  cacheTimestamp = Date.now();
}

export function isEventsCacheStale(): boolean {
  if (!cachedEvents) return true;
  return Date.now() - cacheTimestamp > EVENTS_CACHE_TTL_MS;
}

/** Persist events to DB so they appear in admin panel */
export async function persistEventsToDb(items: SidebarEventItem[]): Promise<void> {
  const sql = getDb();

  // Ensure new columns exist (safe to run multiple times)
  await sql`
    ALTER TABLE events_feed_items
    ADD COLUMN IF NOT EXISTS price_ru TEXT,
    ADD COLUMN IF NOT EXISTS date_text_ru TEXT
  `.catch(() => {});

  for (const item of items) {
    await sql`
      INSERT INTO events_feed_items (
        id, source, source_url, title, price, price_ru, date_text, date_text_ru,
        venue, category, topic_suggestion, topic_suggestion_ru,
        mode_suggestion, created_at, updated_at
      ) VALUES (
        ${item.id}, ${item.source}, ${item.sourceUrl}, ${item.title},
        ${item.price ?? null}, ${item.priceRu ?? null},
        ${item.dateText ?? null}, ${item.dateTextRu ?? null},
        ${item.venue ?? null}, ${item.category ?? null},
        ${item.topicSuggestion}, ${item.topicSuggestionRu},
        ${item.modeSuggestion}, NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        source_url = EXCLUDED.source_url,
        price = EXCLUDED.price,
        price_ru = EXCLUDED.price_ru,
        date_text = EXCLUDED.date_text,
        date_text_ru = EXCLUDED.date_text_ru,
        venue = EXCLUDED.venue,
        category = EXCLUDED.category,
        topic_suggestion = EXCLUDED.topic_suggestion,
        topic_suggestion_ru = EXCLUDED.topic_suggestion_ru,
        mode_suggestion = EXCLUDED.mode_suggestion,
        updated_at = NOW()
    `;
  }
}

/** Load events from DB, respecting visible flag */
export async function loadEventsFromDb(): Promise<SidebarEventItem[]> {
  const sql = getDb();
  const rows = await sql`
    SELECT * FROM events_feed_items
    WHERE visible = TRUE
    ORDER BY created_at DESC
    LIMIT 10
  `;

  return rows.map((row) => ({
    id: row.id as string,
    source: row.source as "iticket",
    title: row.title as string,
    sourceUrl: row.source_url as string,
    price: (row.price as string) || undefined,
    priceRu: (row.price_ru as string) || undefined,
    dateText: (row.date_text as string) || undefined,
    dateTextRu: (row.date_text_ru as string) || undefined,
    venue: (row.venue as string) || undefined,
    category: (row.category as string) || undefined,
    topicSuggestion: row.topic_suggestion as string,
    topicSuggestionRu: row.topic_suggestion_ru as string,
    modeSuggestion: row.mode_suggestion as RoomModeId,
  }));
}
