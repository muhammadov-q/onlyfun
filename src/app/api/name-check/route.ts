import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    let ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";
    if (ip.startsWith("::ffff:")) ip = ip.slice(7);

    const sql = getDb();
    const rows = await sql`SELECT name FROM user_names WHERE ip = ${ip} LIMIT 1`;
    if (rows[0]?.name) {
      return NextResponse.json({ name: rows[0].name });
    }
    return NextResponse.json({ name: null });
  } catch {
    return NextResponse.json({ name: null });
  }
}
