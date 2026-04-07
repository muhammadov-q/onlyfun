import { NextResponse } from "next/server";
import { getSession, hashPassword } from "@/lib/auth";
import { getDb } from "@/lib/db";

/** Update an admin user */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const adminId = parseInt(id, 10);
  if (isNaN(adminId)) {
    return NextResponse.json({ error: "Invalid admin ID" }, { status: 400 });
  }

  const body = await request.json();
  const { name, email, password } = body as { name?: string; email?: string; password?: string };

  const sql = getDb();

  // Check admin exists
  const existing = await sql`SELECT id FROM admin_users WHERE id = ${adminId} LIMIT 1`;
  if (!existing.length) {
    return NextResponse.json({ error: "Admin not found" }, { status: 404 });
  }

  // Check email uniqueness if changing
  if (email?.trim()) {
    const emailTaken = await sql`
      SELECT id FROM admin_users WHERE email = ${email.trim()} AND id != ${adminId} LIMIT 1
    `;
    if (emailTaken.length > 0) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }
  }

  // Build update
  if (name?.trim()) {
    await sql`UPDATE admin_users SET name = ${name.trim()}, updated_at = NOW() WHERE id = ${adminId}`;
  }
  if (email?.trim()) {
    await sql`UPDATE admin_users SET email = ${email.trim()}, updated_at = NOW() WHERE id = ${adminId}`;
  }
  if (password && password.length >= 6) {
    const hash = await hashPassword(password);
    await sql`UPDATE admin_users SET password_hash = ${hash}, updated_at = NOW() WHERE id = ${adminId}`;
  }

  const updated = await sql`
    SELECT id, email, name, created_at FROM admin_users WHERE id = ${adminId} LIMIT 1
  `;

  return NextResponse.json({ admin: updated[0] });
}

/** Delete an admin user */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const adminId = parseInt(id, 10);
  if (isNaN(adminId)) {
    return NextResponse.json({ error: "Invalid admin ID" }, { status: 400 });
  }

  // Prevent self-deletion
  if (adminId === session.id) {
    return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
  }

  const sql = getDb();

  // Ensure at least one admin remains
  const count = await sql`SELECT COUNT(*)::int as count FROM admin_users`;
  if (count[0].count <= 1) {
    return NextResponse.json({ error: "Cannot delete the last admin" }, { status: 400 });
  }

  await sql`DELETE FROM admin_users WHERE id = ${adminId}`;

  return NextResponse.json({ success: true });
}
