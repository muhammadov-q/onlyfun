import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

// GET — list all name locks
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sql = getDb();
  const rows = await sql`SELECT * FROM user_names ORDER BY updated_at DESC`;
  return NextResponse.json({ locks: rows });
}

// PUT — update a name lock (admin changes the locked name for an IP)
export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, name } = await request.json();
  if (!id || !name?.trim()) {
    return NextResponse.json({ error: "id and name are required" }, { status: 400 });
  }

  const sql = getDb();
  await sql`UPDATE user_names SET name = ${name.trim()}, updated_at = NOW() WHERE id = ${id}`;
  return NextResponse.json({ success: true });
}

// DELETE — remove a name lock (allows user to pick a new name)
export async function DELETE(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const sql = getDb();
  await sql`DELETE FROM user_names WHERE id = ${id}`;
  return NextResponse.json({ success: true });
}
