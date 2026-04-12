import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

// GET — admin list all messages
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sql = getDb();
  const rows = await sql`
    SELECT id, name, message, created_at
    FROM podcast_messages
    ORDER BY created_at DESC
    LIMIT 200
  `;
  return NextResponse.json({ items: rows });
}

// DELETE — single or bulk delete
export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const sql = getDb();

  if (Array.isArray(body.ids)) {
    await sql`DELETE FROM podcast_messages WHERE id = ANY(${body.ids}::int[])`;
  } else if (body.id) {
    await sql`DELETE FROM podcast_messages WHERE id = ${body.id}`;
  }

  return NextResponse.json({ ok: true });
}
