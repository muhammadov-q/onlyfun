import { NextResponse } from "next/server";
import { isAiEnabled } from "@/lib/settings";

export async function GET() {
  const enabled = await isAiEnabled();
  return NextResponse.json({ enabled });
}
