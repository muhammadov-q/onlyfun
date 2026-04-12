import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// POST — delete messages older than 7 days
// Can be called by an external cron service (e.g. cron-job.org) or manually
export async function POST(req: Request) {
  // Simple secret check to prevent abuse
  const secret = req.headers.get("x-cleanup-secret") || new URL(req.url).searchParams.get("secret");
  if (secret !== process.env.CLEANUP_SECRET && process.env.CLEANUP_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const sql = getDb();
    const result = await sql`
      DELETE FROM podcast_messages
      WHERE created_at < NOW() - INTERVAL '7 days'
    `;
    const deleted = (result as { count?: number }).count ?? 0;
    return NextResponse.json({ ok: true, deleted });
  } catch (e) {
    console.error("podcast cleanup error:", e);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
