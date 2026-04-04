import { NextResponse } from "next/server";
import { getCachedFeed } from "@/lib/news/cache";
import { runIngest } from "@/lib/news/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  // Return cached feed if available
  const cached = await getCachedFeed();
  if (cached) {
    return NextResponse.json({ items: cached, stale: false });
  }

  // No cache — run ingest directly
  const result = await runIngest();
  return NextResponse.json({ items: result.items, stale: false });
}
