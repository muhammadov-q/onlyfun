import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

const WS_SERVER_URL = process.env.WS_SERVER_URL || "http://localhost:1999";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await fetch(`${WS_SERVER_URL}/admin/stats`, {
      headers: { Authorization: `Bearer ${process.env.JWT_SECRET}` },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch stats" }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "WS server unreachable" }, { status: 502 });
  }
}
