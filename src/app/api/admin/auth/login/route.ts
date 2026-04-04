import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { verifyPassword, createToken, getTokenCookieOptions } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const sql = getDb();
    const rows = await sql`SELECT * FROM admin_users WHERE email = ${email} LIMIT 1`;
    const user = rows[0];

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = await createToken({ id: user.id, email: user.email });
    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name },
    });
    response.cookies.set(getTokenCookieOptions(token));

    return response;
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
