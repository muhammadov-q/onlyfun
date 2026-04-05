import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { runIngest } from "@/lib/news/ingest";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await runIngest();
    return NextResponse.json({ ok: true, count: result.items.length, meta: result.meta });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sql = getDb();
  const rows = await sql`
    SELECT * FROM news_feed_items ORDER BY created_at DESC LIMIT 50
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
    await sql`UPDATE news_feed_items SET visible = ${body.visible} WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  }

  // Full edit
  const { headline, headline_ru, line1, line1_ru, mode_suggestion } = body;
  await sql`
    UPDATE news_feed_items SET
      headline = COALESCE(${headline ?? null}, headline),
      headline_ru = COALESCE(${headline_ru ?? null}, headline_ru),
      line1 = COALESCE(${line1 ?? null}, line1),
      line1_ru = COALESCE(${line1_ru ?? null}, line1_ru),
      mode_suggestion = COALESCE(${mode_suggestion ?? null}, mode_suggestion),
      visible = COALESCE(${body.visible ?? null}, visible)
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
    await sql`DELETE FROM news_feed_items WHERE id = ANY(${body.ids})`;
    return NextResponse.json({ ok: true, deleted: body.ids.length });
  }

  // Single delete
  const { id } = body;
  if (!id) return NextResponse.json({ error: "id or ids required" }, { status: 400 });

  await sql`DELETE FROM news_feed_items WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
