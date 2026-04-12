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

// PATCH — edit a message
export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const id = Number(body.id);
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const sql = getDb();
  const updates: string[] = [];

  if (typeof body.message === "string") {
    const message = body.message.trim().slice(0, 280);
    if (message.length < 1)
      return NextResponse.json({ error: "Message cannot be empty" }, { status: 400 });
    await sql`UPDATE podcast_messages SET message = ${message} WHERE id = ${id}`;
  }
  if (typeof body.name === "string") {
    const name = body.name.trim().slice(0, 30);
    if (name.length < 1)
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    await sql`UPDATE podcast_messages SET name = ${name} WHERE id = ${id}`;
  }

  const rows =
    await sql`SELECT id, name, message, created_at FROM podcast_messages WHERE id = ${id} LIMIT 1`;
  return NextResponse.json({ ok: true, item: rows[0] ?? null });
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
