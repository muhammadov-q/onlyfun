import { NextResponse } from "next/server";
import { getSession, verifyPassword, hashPassword } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current password and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const sql = getDb();
    const rows = await sql`SELECT * FROM admin_users WHERE id = ${session.id} LIMIT 1`;
    const user = rows[0];

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const valid = await verifyPassword(currentPassword, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
    }

    const newHash = await hashPassword(newPassword);
    await sql`UPDATE admin_users SET password_hash = ${newHash}, updated_at = NOW() WHERE id = ${session.id}`;

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
