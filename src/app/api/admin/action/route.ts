import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

const WS_SERVER_URL = process.env.WS_SERVER_URL || "http://localhost:1999";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const res = await fetch(`${WS_SERVER_URL}/admin/action`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.JWT_SECRET}`,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: "WS server unreachable" }, { status: 502 });
  }
}
