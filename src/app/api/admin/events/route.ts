import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sql = getDb();
  const rows = await sql`
    SELECT * FROM events_feed_items ORDER BY created_at DESC LIMIT 50
  `;

  return NextResponse.json({ items: rows });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const sql = getDb();

  // If only toggling visibility
  if (typeof body.visible === "boolean" && Object.keys(body).length === 2) {
    await sql`UPDATE events_feed_items SET visible = ${body.visible}, updated_at = NOW() WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  }

  // Full edit
  const { title, venue, date_text, price, category } = body;
  await sql`
    UPDATE events_feed_items SET
      title = COALESCE(${title ?? null}, title),
      venue = COALESCE(${venue ?? null}, venue),
      date_text = COALESCE(${date_text ?? null}, date_text),
      price = COALESCE(${price ?? null}, price),
      category = COALESCE(${category ?? null}, category),
      visible = COALESCE(${body.visible ?? null}, visible),
      updated_at = NOW()
    WHERE id = ${id}
  `;

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();

  const sql = getDb();

  // Support bulk delete with ids array
  if (Array.isArray(body.ids) && body.ids.length > 0) {
    await sql`DELETE FROM events_feed_items WHERE id = ANY(${body.ids})`;
    return NextResponse.json({ ok: true, deleted: body.ids.length });
  }

  // Single delete
  const { id } = body;
  if (!id) return NextResponse.json({ error: "id or ids required" }, { status: 400 });

  await sql`DELETE FROM events_feed_items WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
