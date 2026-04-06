import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const sql = getDb();

    // 1. Try device token first (per-browser, no shared-network collision)
    const did = req.cookies.get("onlyfun-did")?.value;
    if (did) {
      const rows = await sql`SELECT name FROM user_names WHERE device_id = ${did} LIMIT 1`;
      if (rows[0]?.name) {
        return NextResponse.json({ name: rows[0].name });
      }
    }

    // 2. Fall back to IP only for legacy rows with no device_id.
    // Rows with a device_id belong to a specific browser — don't match
    // other devices that share the same IP (e.g. same WiFi).
    let ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      "127.0.0.1";
    if (ip.startsWith("::ffff:")) ip = ip.slice(7);

    const rows =
      await sql`SELECT name FROM user_names WHERE ip = ${ip} AND device_id IS NULL LIMIT 1`;
    if (rows[0]?.name) {
      return NextResponse.json({ name: rows[0].name });
    }
    return NextResponse.json({ name: null });
  } catch {
    return NextResponse.json({ name: null });
  }
}
