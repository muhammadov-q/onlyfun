import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

// GET — list all blocked users
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sql = getDb();
  const rows = await sql`SELECT * FROM blocked_users ORDER BY created_at DESC`;
  return NextResponse.json({ blocked: rows });
}

// POST — block a user by IP
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ip, name, reason, minutes } = await request.json();
  if (!ip || !minutes) {
    return NextResponse.json({ error: "ip and minutes are required" }, { status: 400 });
  }

  const sql = getDb();
  const blockedUntil = new Date(Date.now() + minutes * 60 * 1000);

  await sql`
    INSERT INTO blocked_users (ip, name, reason, blocked_until)
    VALUES (${ip}, ${name || null}, ${reason || null}, ${blockedUntil.toISOString()})
  `;

  return NextResponse.json({ success: true, blockedUntil: blockedUntil.toISOString() });
}

// DELETE — unblock
export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const sql = getDb();
  await sql`DELETE FROM blocked_users WHERE id = ${id}`;
  return NextResponse.json({ success: true });
}
