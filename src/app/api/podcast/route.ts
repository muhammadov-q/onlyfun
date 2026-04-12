import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET — public feed (last 50 messages from the past 7 days)
export async function GET() {
  try {
    const sql = getDb();
    const rows = await sql`
      SELECT id, name, message, created_at
      FROM podcast_messages
      WHERE created_at > NOW() - INTERVAL '7 days'
      ORDER BY created_at DESC
      LIMIT 50
    `;
    return NextResponse.json({ messages: rows });
  } catch (e) {
    console.error("podcast GET error:", e);
    return NextResponse.json({ messages: [] });
  }
}

// POST — anyone can post (rate-limited by name, 1 per minute)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body.name ?? "")
      .trim()
      .slice(0, 30);
    const message = String(body.message ?? "")
      .trim()
      .slice(0, 280);

    if (name.length < 1 || message.length < 1) {
      return NextResponse.json({ error: "Name and message required" }, { status: 400 });
    }

    const sql = getDb();

    // Simple rate limit: 1 message per name per minute
    const recent = await sql`
      SELECT id FROM podcast_messages
      WHERE name = ${name} AND created_at > NOW() - INTERVAL '1 minute'
      LIMIT 1
    `;
    if (recent.length > 0) {
      return NextResponse.json(
        { error: "Please wait a minute before posting again" },
        { status: 429 }
      );
    }

    const rows = await sql`
      INSERT INTO podcast_messages (name, message)
      VALUES (${name}, ${message})
      RETURNING id, name, message, created_at
    `;

    return NextResponse.json({ ok: true, message: rows[0] });
  } catch (e) {
    console.error("podcast POST error:", e);
    return NextResponse.json({ error: "Failed to post" }, { status: 500 });
  }
}
