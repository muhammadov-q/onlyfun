import { NextResponse } from "next/server";
import { runIngest } from "@/lib/news/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const result = await runIngest();

  if (result.error && result.items.length === 0) {
    return NextResponse.json(result, { status: 502 });
  }

  return NextResponse.json(result);
}
