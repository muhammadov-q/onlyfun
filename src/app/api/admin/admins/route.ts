import { NextResponse } from "next/server";
import { getSession, hashPassword } from "@/lib/auth";
import { getDb } from "@/lib/db";

/** List all admin users */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sql = getDb();
  const admins = await sql`
    SELECT id, email, name, created_at FROM admin_users ORDER BY created_at ASC
  `;

  return NextResponse.json({ admins, currentId: session.id });
}

/** Create a new admin user */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, email, password } = body as { name: string; email: string; password: string };

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!email?.trim()) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  if (!password || password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }

  const sql = getDb();

  // Check if email already exists
  const existing = await sql`SELECT id FROM admin_users WHERE email = ${email.trim()} LIMIT 1`;
  if (existing.length > 0) {
    return NextResponse.json({ error: "An admin with this email already exists" }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const rows = await sql`
    INSERT INTO admin_users (email, password_hash, name)
    VALUES (${email.trim()}, ${passwordHash}, ${name.trim()})
    RETURNING id, email, name, created_at
  `;

  return NextResponse.json({ admin: rows[0] }, { status: 201 });
}
