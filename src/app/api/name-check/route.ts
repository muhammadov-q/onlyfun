import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const h = await headers();
    let ip = h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "unknown";
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
