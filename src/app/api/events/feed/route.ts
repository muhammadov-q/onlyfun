import { NextResponse } from "next/server";
import { fetchITicketEventsPage } from "@/lib/events/sources/iticket/fetchEventsPage";
import {
  parseITicketEventsPage,
  extractEventLinks,
} from "@/lib/events/sources/iticket/parseEventsPage";
import { fetchITicketEventDetail } from "@/lib/events/sources/iticket/fetchEventDetail";
import { parseITicketEventDetail } from "@/lib/events/sources/iticket/parseEventDetail";
import { rankAndTransformEvents } from "@/lib/events/rankEvents";
import {
  getCachedEvents,
  setCachedEvents,
  persistEventsToDb,
  loadEventsFromDb,
} from "@/lib/events/cache";
import { shouldScrapeToday } from "@/lib/scrape-guard";
import type { RawEventItem } from "@/types/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const isDev = process.env.NODE_ENV === "development";
const MAX_DETAIL_FETCHES = 12;

export async function GET() {
  // Return cached events if available
  const cached = getCachedEvents();
  if (cached) {
    return NextResponse.json({ items: cached, stale: false });
  }

  // Only scrape once per day, before 7PM Bishkek time
  if (!shouldScrapeToday("events")) {
    // Try DB as fallback
    try {
      const dbEvents = await loadEventsFromDb();
      if (dbEvents.length > 0) {
        setCachedEvents(dbEvents);
        return NextResponse.json({ items: dbEvents, stale: true });
      }
    } catch {}
    return NextResponse.json({ items: [], stale: true });
  }

  try {
    const html = await fetchITicketEventsPage();

    // Step A: Try Nuxt payload extraction first (fast, single request)
    let rawEvents = parseITicketEventsPage(html);

    // Step B: If Nuxt payload didn't yield results, use two-step flow
    // Extract event links from HTML → fetch each detail page
    if (rawEvents.length === 0) {
      if (isDev) console.log("[events/feed] Nuxt payload empty, trying two-step scrape");

      const links = extractEventLinks(html);
      if (isDev) console.log(`[events/feed] Found ${links.length} candidate event links`);

      const detailItems = await fetchDetailPages(
        links.map((l) => l.href).slice(0, MAX_DETAIL_FETCHES)
      );

      rawEvents = detailItems;
    }

    if (rawEvents.length === 0) {
      // Scrape returned nothing — fall back to existing DB events
      try {
        const dbEvents = await loadEventsFromDb();
        if (dbEvents.length > 0) {
          setCachedEvents(dbEvents);
          return NextResponse.json({ items: dbEvents, stale: true });
        }
      } catch {}
      return NextResponse.json({ items: [], stale: false });
    }

    if (isDev) console.log(`[events/feed] Total raw events: ${rawEvents.length}`);

    const ranked = rankAndTransformEvents(rawEvents, 8);

    // Persist to DB for admin panel, then load back (respects visible flag)
    await persistEventsToDb(ranked).catch(() => {});
    const visible = await loadEventsFromDb().catch(() => ranked);

    setCachedEvents(visible);

    return NextResponse.json({ items: visible, stale: false });
  } catch (e) {
    // Try DB as fallback
    try {
      const dbEvents = await loadEventsFromDb();
      if (dbEvents.length > 0) {
        setCachedEvents(dbEvents);
        return NextResponse.json({ items: dbEvents, stale: true });
      }
    } catch {}

    const stale = getCachedEvents();
    if (stale) {
      return NextResponse.json({ items: stale, stale: true });
    }

    return NextResponse.json({ items: [], error: String(e), stale: false }, { status: 502 });
  }
}

/**
 * Fetch multiple event detail pages in parallel (with concurrency limit).
 */
async function fetchDetailPages(paths: string[]): Promise<RawEventItem[]> {
  const results: RawEventItem[] = [];

  // Fetch in batches of 4 to avoid overwhelming the server
  const batchSize = 4;
  for (let i = 0; i < paths.length; i += batchSize) {
    const batch = paths.slice(i, i + batchSize);
    const settled = await Promise.allSettled(
      batch.map(async (path) => {
        const html = await fetchITicketEventDetail(path);
        return parseITicketEventDetail(html, path);
      })
    );

    for (const result of settled) {
      if (result.status === "fulfilled" && result.value) {
        results.push(result.value);
      }
    }
  }

  if (isDev) console.log(`[events/feed] Detail pages yielded ${results.length} events`);

  return results;
}
