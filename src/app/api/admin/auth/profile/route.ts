import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, email } = await request.json();

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    const sql = getDb();

    // Check email uniqueness if changed
    if (email !== session.email) {
      const existing =
        await sql`SELECT id FROM admin_users WHERE email = ${email} AND id != ${session.id} LIMIT 1`;
      if (existing.length > 0) {
        return NextResponse.json({ error: "Email already in use" }, { status: 409 });
      }
    }

    await sql`UPDATE admin_users SET name = ${name.trim()}, email = ${email.trim()}, updated_at = NOW() WHERE id = ${session.id}`;

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
