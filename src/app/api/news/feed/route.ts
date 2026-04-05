import { NextResponse } from "next/server";
import { getCachedFeed } from "@/lib/news/cache";
import { runIngest } from "@/lib/news/ingest";
import { shouldScrapeToday } from "@/lib/scrape-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const cached = await getCachedFeed();

  // If cache is fresh, return immediately
  if (cached.fresh && cached.items.length > 0) {
    return NextResponse.json({ items: cached.items, stale: false });
  }

  // Try to ingest new content if allowed
  if (shouldScrapeToday("news")) {
    const result = await runIngest();
    if (result.items.length > 0) {
      return NextResponse.json({ items: result.items, stale: false });
    }
  }

  // Always fall back to whatever items exist in the DB
  return NextResponse.json({ items: cached.items, stale: !cached.fresh });
}
